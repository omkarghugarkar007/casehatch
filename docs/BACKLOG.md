# Implementation backlog

The runtime MVP now exists. See [current implementation status](STATUS.md) and [local validation](VALIDATION.md). This document preserves the original issue order and acceptance targets; external evaluations and remote launch tasks remain open.

Planning IDs below are not created GitHub issue numbers. Import these into the actual repository only when repository setup is requested. Dependencies and acceptance criteria are also available in [`backlog.json`](../backlog.json).

## Suggested work order

M0 foundations plus the synthetic fixture; M1 context/decisions/plan; M2 normal tests and evidence; M3 reports, CI, hook and negative fixtures; M4 agent packaging/comparison; M5 public alpha. Develop the shared agent recipe early, then package both native integrations after the contract is stable.

| ID | Issue | Milestone | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| CH-001 | Repository and package scaffold | M0 | P0 | None |
| CH-002 | Canonical contracts and stable IDs | M0 | P0 | CH-001 |
| CH-003 | CLI initialization and diagnostics | M0 | P0 | CH-002 |
| CH-004 | Local context import and provenance | M0 | P0 | CH-002, CH-003 |
| CH-005 | Agent-normalized document and ticket import | M1 | P0 | CH-004 |
| CH-006 | Bounded feature brief and source conflicts | M1 | P0 | CH-004, CH-005 |
| CH-007 | Decision memory and three-question limit | M1 | P0 | CH-006 |
| CH-008 | Bounded scenario proposal policy | M1 | P0 | CH-006, CH-007 |
| CH-009 | Plan validation, freezing and revisions | M1 | P0 | CH-002, CH-007, CH-008 |
| CH-010 | Synthetic app and resettable seeded regressions | M0 | P0 | CH-002 |
| CH-011 | Native test reuse and generation recipe | M2 | P0 | CH-009, CH-010 |
| CH-012 | Playwright execution and evidence reporter | M2 | P0 | CH-011 |
| CH-013 | Evidence revision and freshness rules | M2 | P0 | CH-009, CH-012 |
| CH-014 | Coverage and readiness evaluator | M2 | P0 | CH-012, CH-013 |
| CH-015 | Quiet terminal and canonical reports | M3 | P0 | CH-014 |
| CH-016 | Saved-check CI replay and budget handling | M3 | P0 | CH-012, CH-014, CH-015 |
| CH-017 | Native Claude Code and Codex skill packaging | M4 | P0 | CH-009, CH-011, CH-015 |
| CH-018 | Opt-in reversible pre-push integration | M3 | P0 | CH-013, CH-015, CH-016 |
| CH-019 | False-green contract and negative fixtures | M3 | P0 | CH-007, CH-012, CH-014, CH-016 |
| CH-020 | Held-out native-agent comparison | M4 | P0 | CH-010, CH-017, CH-019 |
| CH-021 | Package and platform smoke validation | M4 | P0 | CH-016, CH-017, CH-018 |
| CH-022 | Quickstart, real demo and report screenshots | M5 | P0 | CH-020, CH-021 |
| CH-023 | Community setup and contribution path | M5 | P1 | CH-001, CH-015 |
| CH-024 | Public alpha and repeated-user validation | M5 | P0 | CH-019, CH-020, CH-021, CH-022, CH-023 |

## Issue acceptance criteria

### CH-001 - Repository and package scaffold

Milestone: M0. Priority: P0. Dependencies: None.

- TypeScript CLI project targets the documented Node baseline and locks dependencies.
- Final license, maturity status and supported-path documentation are ready before publication.
- No install command or success badge claims a nonexistent runtime.

### CH-002 - Canonical contracts and stable IDs

Milestone: M0. Priority: P0. Dependencies: CH-001.

- Config, source, decision, obligation, case and evidence records have versioned schemas.
- Required/candidate/deferred/excluded states and obligation-to-case roll-up are explicit.
- Illustrative data and empty required scope cannot satisfy a gate.

### CH-003 - CLI initialization and diagnostics

Milestone: M0. Priority: P0. Dependencies: CH-002.

- Init is idempotent, records ownership and preserves user files.
- Doctor is read-only and reports missing runner/config/source access clearly.
- Machine output and stable error/exit-code contracts work.

### CH-004 - Local context import and provenance

Milestone: M0. Priority: P0. Dependencies: CH-002, CH-003.

- Markdown/text sources retain original locators, hashes and capture metadata.
- Unreadable and partially imported inputs remain visible.
- Raw private context and artifacts are not automatically committed.

### CH-005 - Agent-normalized document and ticket import

Milestone: M1. Priority: P0. Dependencies: CH-004.

- Existing agent tools can supply normalized source text with origin and extraction limits.
- Summaries and excerpts remain distinguishable from complete extraction.
- No new connector authentication or credential copying is required by the alpha.

### CH-006 - Bounded feature brief and source conflicts

Milestone: M1. Priority: P0. Dependencies: CH-004, CH-005.

- A compact bundle links relevant rules, actors, outcomes and exclusions to sources.
- Conflicting rules and unreviewed important source sections are explicit.
- Current implementation and timestamps do not silently override product authority.

### CH-007 - Decision memory and three-question limit

Milestone: M1. Priority: P0. Dependencies: CH-006.

- Zero to three distinct material questions can be asked per feature revision.
- Unchanged answers are reused and revisions cannot evade the limit.
- Unresolved consequential intent remains incomplete after the question budget is exhausted.

### CH-008 - Bounded scenario proposal policy

Milestone: M1. Priority: P0. Dependencies: CH-006, CH-007.

- Equivalent cases are deduplicated and distinct important outcomes are prioritized.
- Source-backed requirements and inferred optional suggestions remain separate.
- Low-impact deferred concerns produce at most one collapsed notice and do not repeat without relevant changes.

### CH-009 - Plan validation, freezing and revisions

Milestone: M1. Priority: P0. Dependencies: CH-002, CH-007, CH-008.

- Plan apply freezes stable obligations/cases and a scope digest without another model call.
- Every required outcome has source/decision/invariant provenance.
- Scope/denominator changes are recorded and cannot hide a failing required case.

### CH-010 - Synthetic app and resettable seeded regressions

Milestone: M0. Priority: P0. Dependencies: CH-002.

- A tiny TypeScript import fixture has documented launch/reset steps and synthetic data.
- Existing happy-path tests pass while an intentional duplicate/retry bug can be triggered.
- Fixture revisions and intended outcomes are documented independently of generated tests.

### CH-011 - Native test reuse and generation recipe

Milestone: M2. Priority: P0. Dependencies: CH-009, CH-010.

- Existing fixtures/tests are reused before new tests are generated.
- Normal Playwright files carry stable case IDs and meaningful outcome mappings.
- Tests run directly through Playwright without a CaseHatch model workflow.

### CH-012 - Playwright execution and evidence reporter

Milestone: M2. Priority: P0. Dependencies: CH-011.

- Collected suite bindings cover every selected required case/project variant exactly as declared.
- Actual runner results preserve retries, skips, expected failures and setup errors.
- Agent narratives or sample reports cannot replace execution evidence.

### CH-013 - Evidence revision and freshness rules

Milestone: M2. Priority: P0. Dependencies: CH-009, CH-012.

- Evidence identifies actual tested tree, plan, test/config/context and fixture fingerprints.
- Changed relevant inputs invalidate evidence; dirty state is not attributed to a different pushed commit.
- Alpha reruns conservatively instead of promising perfect impact-based reuse.

### CH-014 - Coverage and readiness evaluator

Milestone: M2. Priority: P0. Dependencies: CH-012, CH-013.

- Required obligation roll-up requires all required concrete case/project variants.
- Execution coverage and passing share remain separate; 0/0 is NO_SCOPE.
- Failure, incomplete, error and ready outcomes follow the documented priority and exit codes.

### CH-015 - Quiet terminal and canonical reports

Milestone: M3. Priority: P0. Dependencies: CH-014.

- Default success is one short summary with an optional collapsed risk count.
- Failures and incomplete states provide expected/observed outcomes and artifact/source links.
- JSON and Markdown render the same canonical report; local HTML is optional alpha polish.

### CH-016 - Saved-check CI replay and budget handling

Milestone: M3. Priority: P0. Dependencies: CH-012, CH-014, CH-015.

- The saved plan/tests replay without any model credentials or inference.
- Budget expiry records partial results and unfinished cases, returning incomplete verification.
- Cleanup is bounded and elapsed time is measured honestly.

### CH-017 - Native Claude Code and Codex skill packaging

Milestone: M4. Priority: P0. Dependencies: CH-009, CH-011, CH-015.

- One canonical workflow is packaged through both documented project skill locations.
- Plan/check/explain modes use the existing agent session and no nested agent process.
- Both paths preserve existing instructions and complete a clean-setup example.

### CH-018 - Opt-in reversible pre-push integration

Milestone: M3. Priority: P0. Dependencies: CH-013, CH-015, CH-016.

- Install/uninstall preserve existing hooks and user edits and are idempotent.
- Hook makes no model calls, asks no questions and verifies the supported pushed revision.
- Unsupported multi-ref/non-HEAD pushes and relevant dirty-state mismatches are explicit.

### CH-019 - False-green contract and negative fixtures

Milestone: M3. Priority: P0. Dependencies: CH-007, CH-012, CH-014, CH-016.

- Fixtures cover zero scope, missing bindings/assertions, skipped/expected-fail/retry-pass and stale results.
- Blocked setup, partial execution and illustrative artifacts cannot yield READY.
- Consequential unresolved intent and denominator changes are tested explicitly.

### CH-020 - Held-out native-agent comparison

Milestone: M4. Priority: P0. Dependencies: CH-010, CH-017, CH-019.

- At least 20 held-out changes across three small repos have reviewed intended behavior.
- Baselines share model/context/environment and comparable budgets; repeated runs are recorded.
- Publish suggestion relevance, regressions detected/missed, questions and user effort, including limitations.

### CH-021 - Package and platform smoke validation

Milestone: M4. Priority: P0. Dependencies: CH-016, CH-017, CH-018.

- Document exact supported Node/Playwright/agent versions and operating systems.
- Clean package install, runner invocation and hook install/uninstall work on advertised paths.
- Unsupported environments fail with useful diagnostics.

### CH-022 - Quickstart, real demo and report screenshots

Milestone: M5. Priority: P0. Dependencies: CH-020, CH-021.

- A fresh user reproduces the complete supported workflow from the README.
- The clip exposes a real labeled seeded bug and links exact commands/revisions/artifacts.
- No sample timings or illustrative JSON are presented as measured execution.

### CH-023 - Community setup and contribution path

Milestone: M5. Priority: P1. Dependencies: CH-001, CH-015.

- Issues, Discussions, private vulnerability reporting, license and contribution policy are finalized.
- Backlog milestones/labels and issue/PR templates are created in the actual repository.
- At least three small contribution tasks have reproducible acceptance criteria.

### CH-024 - Public alpha and repeated-user validation

Milestone: M5. Priority: P0. Dependencies: CH-019, CH-020, CH-021, CH-022, CH-023.

- Repository and package names are rechecked/reserved before publishing v0.1.0-alpha.
- Five design partners use the workflow on repeated PRs and first-run friction is recorded.
- Continue/narrow decisions use repeat value and baseline improvement, not star-count targets.
