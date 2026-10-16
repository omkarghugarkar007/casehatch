# Product requirements

## Problem and first user

A developer can pass an existing test suite while missing a product rule, recovery path or permission boundary. The intended behavior may be split across a PRD, BRD, issue, story, conversation and implementation. Repeatedly prompting an agent to consider every edge case produces noise and uncertain coverage.

The first user already has Claude Code or Codex and a TypeScript project with a working Playwright setup. CaseHatch helps that developer establish a small, explicit feature scope and keep meaningful checks attached to it.

## Product goal

Make `casehatch check` a useful pre-push practice: source-grounded behavior obligations, a realistic number of normal tests and a short explanation of remaining uncertainty.

## User journeys

### A. Start a feature

- The developer identifies a feature and provides documents, paths or normalized ticket content.
- CaseHatch's agent workflow reads relevant sources and existing decisions before asking questions.
- The agent summarizes expected behavior and raises at most three questions whose answers materially change the plan.
- Confirmed/source-backed requirements become required scope. Inferred risks and unresolved expected outcomes remain labeled.
- The plan is saved with stable IDs, source references and a scope revision.

No requirement to answer a generic onboarding questionnaire or approve each generated case separately. Reuse the user's existing instruction and accepted source criteria. Clarification is about missing behavior, not repeated permission to perform routine test work.

### B. Implement and generate checks

- The agent reuses existing tests, app launch recipes and data fixtures.
- New normal test files are written only where they add an uncovered required behavior.
- A case maps to a business outcome and one or more meaningful assertions. Existence of an `expect` call alone is insufficient evidence of semantic correctness.
- A feature can mix Playwright API checks with browser journeys.
- Discovered failures remain failures until the implementation or an explicitly corrected requirement changes.

### C. Push with low interruption

- The check runs saved required cases without model calls or questions.
- A complete success fits in one line plus an optional collapsed risk count.
- A failure identifies the expected outcome, observed result and artifact path.
- Missing fixtures, stale context and budget exhaustion show incomplete verification rather than a product bug.
- Existing acknowledged optional concerns remain quiet unless their relevant context changes.

### D. Revisit a feature

- Changes to a source, decision, test or relevant implementation invalidate affected evidence.
- Previously answered questions are reused when their assumptions remain valid.
- A material change can create a new plan revision. An agent cannot increment the revision just to evade the three-question limit.
- A changed denominator is explained; existing baseline and new scope are not silently compared as the same percentage.

## Functional requirements

| ID | Requirement | Alpha acceptance condition |
| --- | --- | --- |
| FR-01 | Gather relevant context | Every required obligation has source/decision/invariant provenance; inaccessible sources are listed |
| FR-02 | Preserve decisions | Unchanged feature context reuses previous answers and does not repeat questions |
| FR-03 | Bound clarification | No more than three distinct decision questions per feature revision, including subquestions |
| FR-04 | Detect conflicts | Conflicting expected outcomes remain explicit until an authoritative decision resolves them |
| FR-05 | Propose omitted risks | Relevant failure/recovery/boundary cases can be suggested even when absent from documents |
| FR-06 | Avoid scope inflation | Speculative suggestions are not silently promoted to mandatory requirements |
| FR-07 | Reuse native tests | Existing files/fixtures remain runnable directly through Playwright |
| FR-08 | Collect real evidence | Runner result, test/case binding, tested revision and artifact locations are recorded |
| FR-09 | Compute honest coverage | Missing, stale, blocked, skipped and partial cases cannot yield complete passing scope |
| FR-10 | Run quietly | Default success is a concise summary; details are opt-in |
| FR-11 | Integrate both agents | The same workflow and contract work through Claude Code and Codex native skill mechanisms |
| FR-12 | Support hooks/CI | Hook is opt-in/reversible; saved-case replay needs no model account in CI |

## Performance and UX targets

Targets must be measured before advertising them. Initial goals are a useful first result within five minutes on a prepared supported project and saved-case replay within a configurable 60-second budget on the demo fixture. Planning time depends on context, the model provider and its limits.

The question budget is a maximum, not a quota. Display at most one short optional-risk notice by default. Acknowledging a deferred concern suppresses repeated notices until a material change.

## Acceptance versus assumptions

- Existing approved acceptance criteria can be recorded as source-grounded scope.
- The user's explicit answers can resolve a rule or exception.
- Established project invariants can apply without asking the same question on every feature.
- An implementation-derived expectation is a hypothesis until supported by intent.
- Important unresolved behavior prevents a ready verdict, even when all currently defined tests pass.

## Alpha exclusions

No hosted service, account system, subscription billing, native mobile testing, comprehensive connector catalog, production exploration, general OCR or claim of universal scenario coverage. Native PDF/DOCX extraction is not required for alpha; agent-mediated text normalization and source-preserving text export are supported import routes.

## Success and failure signals

Useful signals: an accepted missing behavior, a real regression reproduced, fewer repeated questions, low setup effort and repeat use on later PRs. Warning signals: speculative suggestions dominate, developers skip the tool to avoid friction, fixtures consume most support time or a good native-agent prompt yields the same result with less work.
