# Coverage and readiness contract

This document defines the deterministic coverage contract. The local MVP implements this contract for the [supported path](STATUS.md); semantic assertion meaning and source relevance still require review. It is not a claim that a complete model of all possible application behavior can be inferred.

## Three levels

1. **Obligation:** a distinct business outcome or invariant in the agreed scope.
2. **Case:** a concrete actor/state/action/data situation needed to check an obligation.
3. **Execution:** a particular runner attempt for the bound test, revision and environment.

One obligation can require several cases. A case can check several obligations only when each mapping identifies the corresponding outcome/assertion. Counting test files, matching titles or detecting an `expect` call is insufficient.

## Scope states

| State | Meaning | Required denominator? |
| --- | --- | --- |
| `required` | Source-grounded or explicitly confirmed behavior selected for this feature | Yes |
| `candidate` | Relevant proposed behavior whose outcome/scope has not been established | No; consequential unresolved candidates can still prevent readiness |
| `deferred` | A recorded optional concern intentionally left for later | No; visible as a deferred concern |
| `excluded` | An explicit, source/decision-backed non-goal or scoped exception | No; exclusions remain visible and versioned |

A required obligation cannot be demoted automatically because its test is hard, slow or failing. Scope changes require a recorded intent/scope decision and a new revision. The report exposes changes to the denominator.

## Case execution states

| State | Counts as fresh execution? | Counts as passed? |
| --- | --- | --- |
| `passed` | Yes | Yes, if all required attempts/projects are valid and the mapping is current |
| `product_failed` | Yes | No |
| `blocked` | No | No |
| `skipped` | No | No |
| `stale` | No | No |
| `missing` | No | No |
| `interrupted` | No | No |
| `unexecuted` | No | No |
| `flaky` | Preserve attempts; incomplete for strict default readiness | No under the default policy |
| `unknown_failure` | Uncertain whether behavior was exercised adequately | No; do not assert a confirmed product defect |

Expected-failure annotations are not a passing business outcome. Retrying until a case passes does not erase failed attempts. A deliberate skip is visible, never equivalent to execution.

## Obligation roll-up

Let R be the required obligations in the frozen scope. Each obligation has a fixed nonempty set of required case/project variants.

- **Planning coverage:** number of obligations whose required cases all have current intent/assertion/test mappings, divided by size of R.
- **Execution coverage:** number of obligations whose required cases all have valid fresh execution evidence, divided by size of R.
- **Passing share:** number of obligations whose required cases all have valid fresh passing results, divided by size of R.

Report numerator, denominator and scope revision with every percentage. An obligation with one of two required cases executed is not fully exercised. A fully executed obligation with a real product failure contributes to execution coverage but not passing share.

When R is empty, percentages are null and verdict is `NO_SCOPE` / exit 2. Do not render 0/0 as 100%.

## Freshness

Evidence records the actual tested commit/tree and plan revision plus fingerprints for the source snapshots, decisions, cases, test files, relevant application files, runner configuration, environment and fixture recipe.

Alpha is conservative: rerun required cases for a new relevant code state; do not implement broad cross-commit result reuse. Changed inputs invalidate evidence until rerun/review. Capture actual working-tree state; a run against local edits must not be labeled as a run against a different pushed commit.

Static dependency selection is incomplete for dynamic calls, flags and indirect dependencies. The first release checks one selected feature and its registered invariants. It does not claim exhaustive repository-wide impact analysis.

## Verdict and exit codes

| Verdict | Conditions | Exit |
| --- | --- | --- |
| `READY` | Nonempty valid scope, all required cases freshly pass, no consequential unresolved intent or invalid context | 0 |
| `FAIL` | At least one confirmed required product failure; incompleteness can also be present | 1 |
| `INCOMPLETE` | Blocked, stale, missing, skipped, flaky, interrupted, budget-limited, unresolved or no-scope verification | 2 |
| `ERROR` | Invalid usage/configuration, unsupported operation or adapter contract failure | 3 |

Classification uncertainty is incomplete verification, not a confirmed bug. A report must show both failures and incompleteness when they coexist. Scope exceptions cannot be hidden behind an unqualified ready badge.

## Output examples

Illustrative successful summary:

> Behavior checks: 12/12 passed - 100% of agreed scope (revision 3). One low-priority concern deferred.

Illustrative failing summary:

> Behavior checks: 4/5 outcomes exercised; 3/5 passed. Duplicate import created a second job. One check blocked. View details.

The default output does not list every passing case. Details include expected/observed outcomes, source locators, case/test/assertion bindings, run revision, environment and artifact locations.

## Must-pass contract fixtures

An evaluator must reject false green for zero required scope, empty case mapping, missing test IDs, duplicate ambiguous bindings, incomplete required parameter/browser variants, swallowed/removed assertions, expected-failure annotations, skip, retry-pass, stale context, changed tests, dirty-versus-pushed revision mismatch, missing fixture setup, partial execution and illustrative/non-run artifacts.

Schema validation can catch structural defects. It cannot prove an assertion reflects the correct business intent; source-grounded review and bug-detection evaluation remain necessary.
