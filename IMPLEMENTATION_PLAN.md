# CaseHatch - public repository implementation plan

Historical design baseline. The working MVP and remaining acceptance work are recorded in [implementation status](docs/STATUS.md); use the [README](README.md) for current commands.

Date: 15 October 2026. Status: design baseline for implementation; no runtime has been built or published.

## 1. Name and product promise

**CaseHatch**

**Tagline: Behavior checks before you push.**

**Repository description:** Turn PRDs, BRDs and tickets into focused behavior checks for Claude Code and Codex.

The name connects test cases to discovery. It can cover explicitly documented behavior and important omissions without claiming exhaustive correctness. The proposed command is `casehatch check`.

Point-in-time checks on 15 October 2026 found zero public repositories in GitHub's `casehatch in:name` search, and the npm registry returned HTTP 404 for `casehatch`. The name and namespace have not been reserved. Recheck at repository/package creation. The suggested repository path is `omkarghugarkar007/casehatch`.

## 2. Decisions already made

| Area | Decision |
| --- | --- |
| Distribution | Public GitHub repository; complete local open-source workflow |
| Proposed license | MIT; include full license text before publishing |
| First users | Developers at small teams already using Claude Code or Codex |
| Initial execution stack | TypeScript repositories with a working Playwright setup |
| Model access | Existing agent session; no CaseHatch inference service or mandatory API key |
| Context | Relevant PRD, BRD, ticket/story, accepted decisions, existing tests and changed code |
| Clarification | Zero to three high-value questions per feature revision; none during a hook |
| Test ownership | Ordinary test files in the user's repository |
| Routine command | `casehatch check`; deterministic replay of a saved plan |
| Coverage | Fixed, versioned required scope; execution and passing shares shown separately |
| UX | One-line success; concise failures; at most one collapsed optional-risk notice |
| State | Local JSON/YAML and artifacts; no database or account required |

## 3. The complete workflow

### Feature start: understand and plan

1. Register available sources and store versions/hashes and source locators.
2. Build a compact feature brief: goal, actors, business rules, expected outcomes, failures, recovery, exclusions and unresolved intent.
3. Reuse relevant answers from previous decisions. Detect source conflicts; do not treat the newest document or current code as automatically authoritative.
4. Propose distinct behavior obligations grounded in sources or project invariants. Keep speculative suggestions separate.
5. Ask up to three questions that change an expected outcome, important scope or test strategy. Batch them into one short interaction when possible.
6. Persist the resulting plan. Explicit source-backed acceptance criteria can enter required scope directly; new inferred requirements need a source, an established invariant or an explicit answer. Unresolved assumptions remain labeled.

Do not add a separate mandatory approval ceremony after these questions. The agent provides a short scope summary that the developer can correct. Recording an existing approved requirement is different from inventing a new requirement.

### Development: turn the plan into normal checks

1. Reuse existing tests and fixtures before generating new files.
2. Map each required obligation to concrete cases and meaningful assertions.
3. Prefer API or focused checks for business rules when they exercise the outcome adequately; use browser journeys when the integration itself matters.
4. Generate ordinary Playwright TypeScript tests and bind them to stable CaseHatch case IDs.
5. Preserve the intended outcome when repairing a test. Test failures can expose product bugs.

### Before push: check and summarize

1. Load the saved plan and validate source/test/config freshness.
2. Run required cases for the selected feature and applicable registered project invariants.
3. Record runner results, assertion mappings, retries, artifact locations and the tested revision/tree.
4. Produce a short result; expand only for a failure or an explicit details request.

This path asks no questions and makes no LLM calls. If context changed, expected behavior is unresolved or execution was incomplete, it reports a specific incomplete status and points back to the planning workflow.

## 4. Bounded coverage and realistic effort

The first release uses one active feature per check. It executes all required cases in that feature's frozen plan; it does not claim perfect automatic semantic impact selection across a large repository.

Required behavior consists of accepted criteria, established project invariants and important confirmed implications. Optional low-impact combinations are candidates or explicitly deferred risks. Deduplicate equivalent cases, select representative values and boundaries, and prefer a case that contributes a distinct rule or failure mode.

Three separate measures are needed:

- **Planning coverage:** required obligations with valid case and assertion mappings / required obligations.
- **Execution coverage:** required obligations whose required cases all produced fresh, valid execution evidence / required obligations.
- **Passing share:** required obligations whose required cases all passed freshly / required obligations.

An obligation with three required concrete cases is complete only when all three meet the relevant condition. A reproduced product failure counts as exercised but not passed. A blocked, stale, skipped, interrupted, missing or unexecuted required case prevents full coverage. No required obligations produces `NO_SCOPE`, not a vacuous 100%.

Display `100% of agreed scope` only with the denominator and scope revision. Show deferred risks separately. Never silently remove a difficult required case or convert an unknown outcome into an exclusion to make the score green.

Use a configurable fast-check budget, initially 60 seconds as a product target on supported small fixtures. Exceeding it yields incomplete evidence and exit code 2. Longer required cases can run in CI or a larger explicit budget; no automatic budget trimming is allowed.

## 5. Architecture and implementation stack

Use one modular TypeScript package first. Node.js 24 LTS is the proposed development baseline. Use a small CLI parser, schema validation, a test framework for meaningful core tests and Playwright as a peer execution dependency. Pin supported versions when implementing; avoid adding several workspace packages prematurely.

| Module | Responsibility |
| --- | --- |
| `src/context/` | Import normalized text, index source locators, retain hashes, build a bounded context bundle |
| `src/plans/` | Validate briefs, decisions, questions, obligations, cases and stable plan revisions |
| `src/coverage/` | Compute evidence states, freshness, counts and readiness deterministically |
| `src/runners/playwright/` | Resolve exact case IDs, invoke the runner and collect actual results |
| `src/reporting/` | Quiet terminal summary, JSON, Markdown and a local static HTML view |
| `src/hooks/` | Opt-in, reversible pre-push integration without overwriting existing hooks |
| `src/cli/` | Command parsing, noninteractive behavior, exit codes and diagnostics |
| `integrations/` | A shared workflow recipe with provider-specific skill packaging |

The agent proposes context interpretation and scenarios. The CLI validates structured records and runs tests. The reporter produces execution evidence. An agent-written paragraph cannot stand in for a runner result.

Local Markdown/text inputs and agent-normalized document/ticket content are the alpha ingestion routes. For PDF/DOCX and remote tickets, reuse a tool already available in the coding agent or accept a text export with provenance. Unsupported or unreadable material must be visible. Native file extractors and service connectors follow after the vertical slice works.

## 6. Proposed CLI contract

```sh
casehatch init --agent both
casehatch context add --feature csv-import --file docs/PRD.md --kind prd
casehatch context export --feature csv-import --format json
casehatch plan validate path/to/draft.json
casehatch plan apply path/to/draft.json
casehatch check --feature csv-import --budget 60s
casehatch report --feature csv-import --details
casehatch hooks install --pre-push --feature csv-import
casehatch doctor
```

These are planned commands, not an available package. Planning is agent-driven; `plan apply` validates and freezes structured input without a nested model call.

Exit codes: 0 for complete required passing checks with fresh resolved scope; 1 for a product failure; 2 for incomplete verification, stale context, unresolved required behavior, blocked setup or budget exhaustion; 3 for usage/configuration/unsupported operation errors. If failures and incompleteness coexist, return 1 and expose both in structured output.

## 7. Six-week alpha roadmap

Estimate for one experienced full-time developer, subject to the prototype findings. Use milestone exit criteria rather than treating the dates as guarantees.

| Week | Milestone | Demonstrable exit condition |
| --- | --- | --- |
| 1 | Contracts and core CLI | Init/import/validate work on a synthetic feature; state and exit-code examples agree |
| 2 | Context, questions and saved plan | Existing agent reads sources, asks at most three useful questions and persists decisions and scope |
| 3 | Tests and runner evidence | Source-grounded cases become normal tests; a real seeded bug is reproduced with reporter evidence |
| 4 | Coverage, freshness and pre-push | Quiet repeated checks work; stale/blocked/budget outcomes cannot look complete |
| 5 | Agent integrations and comparison | Both agents complete the workflow; held-out changes are compared with native-agent baselines |
| 6 | Public alpha | Clean-checkout demo, documentation, contribution path, reproducible evidence and a signed-off release checklist |

By the end of week 2, show a tiny end-to-end vertical slice rather than only architecture. Maintain one supported fixture and runner throughout. See the backlog for issue order and dependencies.

## 8. First implementation tasks

1. Define canonical config, source, decision, obligation, case and evidence records. Lock the status and denominator semantics.
2. Scaffold the TypeScript CLI and its machine-readable errors; add the synthetic CSV-import sources.
3. Implement local source import and a bounded context export with source references and missing-context reporting.
4. Implement question accounting and reusable decisions, including conflicts and unresolved outcomes.
5. Implement plan validation, stable IDs, revisions and deterministic case selection.
6. Build the Playwright reporter and exact case bindings before trusting any green summary.
7. Add coverage computation, quiet reports, revision/freshness checks and the optional hook.
8. Package one shared workflow for Claude Code and Codex and validate subscription-based local use through their native sessions.

Core tests should target false-green failure modes: skipped cases, swallowed assertions, expected failures, flaky retries, changed context, stale artifacts, missing mappings and timeout. Avoid tests that merely mirror helper implementations.

## 9. Public repository and contribution plan

Before publication: add the final MIT license; enable Issues/Discussions and private vulnerability reporting; create milestones and labels from the backlog; include issue and PR templates; state the supported stack and planning/alpha maturity clearly. Do not include private PRDs, tickets, credentials or real customer fixtures in examples.

Launch with a clearly labeled synthetic app. Existing tests pass, CaseHatch identifies a missing duplicate-import/retry behavior, a new normal test reproduces the bug, and the saved check prevents the regression after the fix. Publish commands, revisions and artifacts used in the demonstration.

Early contribution areas: clearer diagnostics, documented fixture recipes, targeted context examples, runner result edge cases and operating-system compatibility. Additional runner or service adapters require a small design proposal so the core remains simple.

## 10. Definition of done for v0.1.0-alpha

- A fresh user can complete the supported example with either coding agent and no CaseHatch account.
- Relevant source context and every obligation's origin can be inspected.
- Clarification never exceeds three questions in one feature revision; unchanged answers are reused.
- The check and hook never invoke a model or ask a question.
- Existing fixtures and ordinary Playwright files are reused.
- Required execution is grounded in reporter output for the tested revision and environment.
- Complete, failing, blocked, missing, stale, skipped, flaky and partial outcomes are distinct.
- Optional suggestions are short, acknowledged concerns do not recur without a relevant change, and no-scope is explicit.
- The same saved tests can replay in CI without model authentication.
- The public example and held-out comparison are reproducible; no unmeasured performance or universal-coverage claims appear in the README.

## 11. Validation and stop criteria

Use three small repositories and at least 20 held-out feature changes with documented intended behavior and seeded regressions. Compare a native coding agent with existing tools, a native agent plus a good planning prompt, and CaseHatch with equivalent context, budgets and models. Repeat runs to expose variability. Evaluate top-five suggestion relevance, important missed cases, regressions reproduced, question usefulness, setup time, repeat-check time and review effort.

Initial product targets, not measured results: a useful first report within five minutes on a prepared supported project; at least 70% of top-five suggestions accepted as relevant; no false green on the contract fixtures; repeat checks within the chosen budget. Review any public-repo speed claim separately from model planning latency.

Five design partners should use the tool on repeated real PRs. Continue broadening the project when at least three return weekly after four weeks and the result is meaningfully better or easier than the native baseline. If it mainly adds ceremony, improve or narrow the task before adding adapters and UI.

## 12. Deferred scope

Hosted dashboards, accounts, billing, a desktop office UI, automatic OCR, broad Jira/Linear/Notion connectors, mobile runners, production exploration, an LLM gateway, vector databases, orchestration of multiple agents and a replacement test framework are not v0.1 goals. Later work includes direct document extraction, optional provider connectors, multiple-feature impact selection, validated result reuse and more runner adapters.

## Primary references

- [Codex skill discovery and packaging](https://learn.chatgpt.com/docs/build-skills)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Playwright custom reporters](https://playwright.dev/docs/test-reporters)
- [Playwright tags and annotations](https://playwright.dev/docs/test-annotations)
- [Git hooks](https://git-scm.com/docs/githooks)
- [Cucumber Example Mapping](https://cucumber.io/docs/bdd/example-mapping/)
- [NIST practical combinatorial testing](https://csrc.nist.gov/pubs/sp/800/142/final)
- [Node.js release status](https://nodejs.org/en/about/previous-releases)

Companion product, architecture, coverage, CLI, backlog and launch documents are included in the repository planning archive. This standalone plan contains the implementation decisions needed to begin.
