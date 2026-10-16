import type {
  Attempt,
  CaseResult,
  CaseState,
  Coverage,
  Plan,
  RunnerEvidence,
} from "../contracts.js";
export function attemptState(
  attempts: Attempt[],
  assertionIds: string[],
): { status: CaseState; reason: string } {
  const result = (status: CaseState, reason: string) => ({ status, reason });
  if (!attempts.length)
    return result("unexecuted", "No completed runner attempt.");
  if (attempts.some((a) => a.status === "skipped"))
    return result("skipped", "Runner skipped a required case.");
  if (attempts.some((a) => a.expectedStatus !== "passed"))
    return result(
      "blocked",
      "Expected-failure or skip annotations cannot pass a behavior obligation.",
    );
  if (attempts.some((a) => a.status === "interrupted"))
    return result("interrupted", "Execution interrupted.");
  const last = attempts.at(-1)!;
  const complete = (a: Attempt) =>
    assertionIds.every((id) =>
      a.assertions.some((s) => s.id === id && s.expects > 0 && s.completed),
    );
  if (last.setupFailed)
    return result(
      "blocked",
      "Required fixture or before hook failed before the test body.",
    );
  if (
    (attempts.length > 1 || attempts.some((a) => a.retry > 0)) &&
    (attempts.some((a) => a.status === "passed") ||
      !attempts.every((a) => a.failedExpect && !a.outsideError))
  )
    return result(
      "flaky",
      "Retries are incomplete under strict readiness; every attempt is retained.",
    );
  if (last.failedExpect && !last.outsideError)
    return result(
      "product_failed",
      "A Playwright assertion failed inside a mapped outcome step.",
    );
  if (last.status === "timedOut")
    return result(
      "blocked",
      "Test timed out; required outcomes were not completely verified.",
    );
  if (last.status !== "passed")
    return result(
      "unknown_failure",
      "Runner failed without an isolated mapped outcome assertion; inspect setup and runner.log.",
    );
  if (!complete(last))
    return result(
      "missing",
      "At least one mapped outcome step did not execute a Playwright expect assertion.",
    );
  if (
    last.assertions.some((a) => a.failed) ||
    last.errors.length ||
    last.outsideError
  )
    return result(
      "unknown_failure",
      "An assertion/step error was swallowed or execution evidence is inconsistent.",
    );
  return result("passed", "All mapped outcome assertions executed and passed.");
}
export function evaluate(
  p: Plan,
  evidence: RunnerEvidence,
  stale = false,
): { caseResults: CaseResult[]; coverage: Coverage; bindingErrors: string[] } {
  const required = p.obligations.filter((o) => o.scope === "required");
  const requiredIds = new Set(required.flatMap((o) => o.requiredCaseIds));
  const bindingErrors: string[] = [];
  const caseResults = p.cases
    .filter((c) => requiredIds.has(c.id))
    .flatMap((c) =>
      c.binding.projects.map((project) => {
        const bindings = evidence.bindings.filter(
          (b) => b.caseIds.includes(c.id) && b.project === project,
        );
        let status: CaseState;
        let reason: string;
        const binding = bindings[0];
        let attempts: Attempt[] = [];
        if (
          bindings.length !== 1 ||
          !binding ||
          binding.file !== c.binding.file ||
          binding.caseIds.length !== 1
        ) {
          status = "missing";
          reason = `Expected one exact @casehatch:${c.id} binding in ${c.binding.file} / ${project || "(default)"}, found ${bindings.length}.`;
          if (
            bindings.length > 1 ||
            (binding &&
              (binding.file !== c.binding.file || binding.caseIds.length !== 1))
          )
            bindingErrors.push(reason);
        } else {
          attempts = evidence.attempts[binding.testId] ?? [];
          ({ status, reason } = attemptState(
            attempts,
            c.assertions.map((a) => `${c.id}:${a.id}`),
          ));
        }
        if (stale) {
          status = "stale";
          reason = "Inputs changed or source/plan context is stale.";
        }
        return {
          caseId: c.id,
          project,
          status,
          reason,
          expectedOutcome: c.expectedOutcome,
          binding,
          attempts,
        };
      }),
    );
  const has = (ids: string[], predicate: (r: CaseResult) => boolean) =>
    ids.every((id) => {
      const results = caseResults.filter((r) => r.caseId === id);
      return results.length > 0 && results.every(predicate);
    });
  const planned = required.filter((o) =>
    has(
      o.requiredCaseIds,
      (r) => !!r.binding && r.status !== "missing" && r.status !== "stale",
    ),
  ).length;
  const executed = required.filter((o) =>
    has(
      o.requiredCaseIds,
      (r) => r.status === "passed" || r.status === "product_failed",
    ),
  ).length;
  const passed = required.filter((o) =>
    has(o.requiredCaseIds, (r) => r.status === "passed"),
  ).length;
  const percent = (n: number) =>
    required.length ? Math.round((10000 * n) / required.length) / 100 : null;
  return {
    caseResults,
    bindingErrors,
    coverage: {
      required: required.length,
      planned,
      executed,
      passed,
      planningPercent: percent(planned),
      executionPercent: percent(executed),
      passingPercent: percent(passed),
    },
  };
}
