import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Config, Report, RunnerEvidence } from "./contracts.js";
import { sources } from "./context/index.js";
import { loadPlan, planContextProblems } from "./plans/index.js";
import { atomicJson, HatchError, inside, withAsyncLock } from "./store.js";
import { runPlaywright } from "./runners/playwright/index.js";
import { snapshot } from "./runners/playwright/environment.js";

export async function check(
  root: string,
  config: Config,
  feature: string,
  budgetSeconds: number,
): Promise<Report> {
  return withAsyncLock(root, async () => {
    const start = performance.now();
    const startedAt = new Date().toISOString();
    const runId = randomUUID();
    const token = randomUUID();
    const frozen = loadPlan(root, feature);
    const p = frozen.plan;
    const requiredIds = new Set(
      p.obligations
        .filter((o) => o.scope === "required")
        .flatMap((o) => o.requiredCaseIds),
    );
    // Generated paths cannot conceal required test or context files from the snapshot.
    for (const file of [
      ...p.cases
        .filter((c) => requiredIds.has(c.id))
        .map((c) => c.binding.file),
      ...sources(root, feature)
        .filter((s) => p.sources.some((ref) => ref.id === s.id))
        .map((s) => s.path),
    ]) {
      if (
        config.generatedDirectories.some(
          (d) => file === d || file.startsWith(d + "/"),
        )
      )
        throw new HatchError(
          "HIDDEN_INPUT",
          `Required test/source lies inside generatedDirectories: ${file}`,
        );
    }
    const before = snapshot(root, config);
    const problems = planContextProblems(root, p);
    problems.push(
      ...p.unresolved.map((x) => "Unresolved: " + x),
      ...p.conflicts.map((x) => "Conflict: " + x),
      ...p.decisions
        .filter((d) => !d.answer)
        .map((d) => "Unanswered: " + d.question),
    );
    const artifacts = `.casehatch/runs/${runId}`;
    const runDir = inside(root, artifacts);
    let evidence: RunnerEvidence = {
      schemaVersion: 1,
      origin: "playwright-reporter",
      runId,
      token,
      bindings: [],
      attempts: {},
      errors: [],
      ended: false,
    };
    let budgetExpired = false;
    let interrupted = false;
    let processExit: number | null = null;
    if (requiredIds.size && !problems.length) {
      const remaining = budgetSeconds * 1000 - (performance.now() - start);
      if (remaining <= 0) budgetExpired = true;
      else
        ({ evidence, budgetExpired, interrupted, processExit } =
          await runPlaywright(
            root,
            config,
            p,
            runDir,
            runId,
            token,
            remaining,
          ));
    }
    const after = snapshot(root, config);
    const stale =
      before.digest !== after.digest ||
      before.head !== after.head ||
      planContextProblems(root, p).length > 0;
    if (before.digest !== after.digest || before.head !== after.head) {
      const changed = [
        ...new Set([...Object.keys(before.files), ...Object.keys(after.files)]),
      ].filter((k) => before.files[k] !== after.files[k]);
      problems.push(
        "Inputs changed during execution: " +
          (changed.slice(0, 8).join(", ") || "revision/environment") +
          ". Rerun; configure only generated output directories as excluded.",
      );
    }
    if (budgetExpired)
      problems.push(
        `Budget of ${budgetSeconds}s exhausted; required cases were not trimmed.`,
      );
    if (interrupted) problems.push("Check interrupted by signal.");
    problems.push(...evidence.errors);
    if (requiredIds.size && !problems.length && !evidence.ended)
      problems.push("Runner did not finish with a complete reporter stream.");
    const { evaluate } = await import("./coverage/index.js");
    const evaluated = evaluate(p, evidence, stale);
    problems.push(...evaluated.bindingErrors);
    if (
      processExit !== 0 &&
      requiredIds.size &&
      !problems.length &&
      evaluated.caseResults.every((r) => r.status === "passed")
    )
      problems.push(
        `Runner exited ${processExit ?? "by signal"} despite passing required tests; inspect runner.log.`,
      );
    if (
      evidence.runnerStatus &&
      evidence.runnerStatus !== "passed" &&
      evaluated.caseResults.every((r) => r.status === "passed")
    )
      problems.push(
        "Runner reported " + evidence.runnerStatus + " outside required cases.",
      );
    const failed = evaluated.caseResults.some(
      (r) => r.status === "product_failed",
    );
    const ready =
      evaluated.coverage.required > 0 &&
      evaluated.coverage.passed === evaluated.coverage.required &&
      !problems.length &&
      !budgetExpired &&
      !interrupted &&
      evidence.ended &&
      processExit === 0;
    const contractError = evaluated.bindingErrors.length > 0;
    const verdict: Report["verdict"] = failed
      ? "FAIL"
      : contractError
        ? "ERROR"
        : !evaluated.coverage.required
          ? "NO_SCOPE"
          : ready
            ? "READY"
            : "INCOMPLETE";
    const report: Report = {
      schemaVersion: 1,
      origin: "casehatch-check",
      runId,
      featureId: feature,
      scopeRevision: p.scopeRevision,
      planDigest: frozen.digest,
      startedAt,
      elapsedMs: Math.round(performance.now() - start),
      verdict,
      exitCode: failed ? 1 : contractError ? 3 : ready ? 0 : 2,
      coverage: evaluated.coverage,
      caseResults: evaluated.caseResults,
      problems,
      scopeDelta: frozen.scopeDelta,
      budgetExpired,
      snapshot: before,
      artifacts,
      deferredConcerns: p.deferredConcerns,
      obligations: p.obligations,
      sources: p.sources,
      sourceRecords: sources(root, feature).filter((s) =>
        p.sources.some((ref) => ref.id === s.id),
      ),
    };
    atomicJson(inside(root, `${artifacts}/report.json`), report);
    atomicJson(inside(root, `.casehatch/runs/latest-${feature}.json`), {
      schemaVersion: 1,
      runId,
    });
    return report;
  });
}
