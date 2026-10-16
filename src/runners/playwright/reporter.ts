import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import type { Attempt, Binding } from "../../contracts.js";

// Append-only events retain completed attempts even after interruption. Only the CLI
// provides the destination and invocation token; reports are never imported as runs.
export default class EvidenceReporter implements Reporter {
  private root = process.env.CASEHATCH_ROOT ?? process.cwd();
  private output = process.env.CASEHATCH_EVENTS;
  private send(type: string, data: unknown) {
    if (!this.output) return;
    mkdirSync(dirname(this.output), { recursive: true });
    appendFileSync(
      this.output,
      JSON.stringify({
        type,
        data,
        token: process.env.CASEHATCH_TOKEN,
        runId: process.env.CASEHATCH_RUN_ID,
      }) + "\n",
    );
  }
  printsToStdio() {
    return false;
  }
  onBegin(config: FullConfig, suite: Suite) {
    const bindings: Binding[] = suite.allTests().map((t) => ({
      testId: t.id,
      caseIds: t.tags
        .filter((x) => x.startsWith("@casehatch:"))
        .map((x) => x.slice(11)),
      file: relative(this.root, t.location.file).split("\\").join("/"),
      project: t.parent.project()?.name ?? "",
      title: t.titlePath().slice(1).join(" › "),
    }));
    this.send("begin", { bindings, version: config.version });
  }
  onTestEnd(test: TestCase, result: TestResult) {
    const assertions = new Map<
      string,
      { id: string; expects: number; failed: boolean; completed: boolean }
    >();
    let failedExpect = false;
    let outsideError = false;
    const walk = (steps: TestStep[], active?: string) => {
      for (const step of steps) {
        const match =
          /^casehatch:([A-Za-z][A-Za-z0-9_-]*):([A-Za-z][A-Za-z0-9_-]*)$/.exec(
            step.title,
          );
        const current = match ? `${match[1]}:${match[2]}` : active;
        if (match && current) {
          const old = assertions.get(current);
          assertions.set(current, {
            id: current,
            expects: old?.expects ?? 0,
            failed: !!old?.failed || !!step.error,
            completed: step.duration >= 0,
          });
        }
        if (step.category === "expect") {
          if (step.error) {
            if (current) failedExpect = true;
            else outsideError = true;
          }
          const assertion = current ? assertions.get(current) : undefined;
          if (assertion) {
            assertion.expects++;
            assertion.failed ||= !!step.error;
          }
        }
        if (step.error && !current && step.category !== "test.step")
          outsideError = true;
        walk(step.steps, current);
      }
    };
    walk(result.steps);
    const attempt: Attempt = {
      status: result.status,
      expectedStatus: test.expectedStatus,
      retry: result.retry,
      durationMs: result.duration,
      assertions: [...assertions.values()],
      errors: result.errors.map(
        (e) => e.message ?? e.value ?? "Unknown runner error",
      ),
      attachments: result.attachments.map((a) => ({
        name: a.name,
        ...(a.path ? { path: a.path } : {}),
      })),
      failedExpect,
      outsideError,
      setupFailed: result.steps.some(
        (s) => s.title === "Before Hooks" && !!s.error,
      ),
    };
    this.send("attempt", { testId: test.id, attempt });
  }
  onError(error: TestError) {
    this.send("error", error.message ?? error.value ?? "Runner error");
  }
  onEnd(result: FullResult) {
    this.send("end", { status: result.status });
  }
}
