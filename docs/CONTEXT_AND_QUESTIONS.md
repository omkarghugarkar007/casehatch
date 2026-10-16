# Context and clarification design

## Context record

Each source records an ID, type (`prd`, `brd`, `story`, `ticket`, `decision`, `invariant`, `test`, `code`), title, local path or URL, captured version/time, content hash and section/page/line locator. Missing access, partial extraction and unreadable sections are first-class states.

The agent produces normalized text when the CLI cannot read the original format. Preserve the original locator and distinguish extracted text from a human summary. A document being mentioned does not mean it was successfully read.

Alpha import routes:

1. Local Markdown or text files registered explicitly by the developer.
2. Source-preserving text/JSON returned by an existing agent document or ticket tool.
3. A developer-supplied export/excerpt marked with its scope and capture date.

Direct Jira/Linear/Notion connectors and PDF/DOCX extraction are subsequent adapters. Do not silently treat an inaccessible source as empty or fully covered.

## Relevant context, not an unlimited document dump

Start with the feature's story/ticket and referenced acceptance criteria, then retrieve relevant product/business rules, linked decisions, existing tests and changed implementation paths. Use titles, anchors, explicit links and lexical retrieval for the initial local index; a vector database is unnecessary for the first release.

Export a bounded context bundle with chunk IDs and source locators. Preserve relevant acceptance criteria and applicable constraints. If the budget prevents reading an important section, retain a visible missing-context item; do not drop it just to fit a prompt.

The feature brief contains goal, actors/permissions, rules, success outcomes, failure/recovery behavior, data boundaries, exclusions and unresolved questions. The code and tests are evidence of implementation, not the final source of product intent.

## Authority and conflicts

Use explicitly configured project authority rules and accepted decisions. A ticket can supersede a PRD rule only when the change is actually authorized; a later timestamp alone is insufficient. Product details cannot silently override an applicable business constraint.

If a PRD says partial import is allowed while a BRD says all rows must succeed together, show both locators. Ask one material question to establish the intended policy or keep the behavior unresolved. Avoid a universal hard-coded document precedence ladder.

## Candidate gaps

For the changed feature, consider actors/permissions, state transitions, data boundaries, duplicate actions, failures, retries, partial completion, recovery and relevant external dependencies. Use project invariants such as tenant isolation or idempotent writes only where they genuinely apply.

An inferred gap needs a reason, its relation to the feature, the uncertain outcome, the consequence if wrong and whether a prior decision already answers it. It is not automatically a mandatory test.

## Choose up to three questions

1. Remove questions already answered by current sources or valid decisions.
2. Merge duplicates and questions resolved by one shared policy.
3. Prefer decisions with substantial consequence, genuine ambiguity and direct relevance to the change.
4. Ask at most three concise decision questions, preferably together with practical answer choices.
5. Record the answer, scope, provenance and why it affects the tests.

Do not disguise twelve subquestions inside three numbered paragraphs. Count distinct decisions. Do not ask low-impact curiosities merely to reach three. Never ask a question during pre-push or unattended CI.

Examples for CSV import, only if the source context is unclear:

- Duplicate file: reject it, ignore already imported content, or intentionally create another import?
- Invalid rows: reject the entire batch or import valid rows and return row-level errors?
- Timeout: should a safe retry resume/reuse the existing job or start a separate operation?

If three answers do not resolve all important unknowns, proceed only with the known plan and preserve an incomplete/needs-decision status for the rest. Lower-impact uncertainties can be explicit assumptions or deferred suggestions. Do not invent a high-impact expected outcome to complete the plan.

## Decision memory and invalidation

Decisions have stable IDs, feature/project scope, linked source hashes, a reason and the plan revision in which they apply. Reuse them until a material source/behavior change invalidates their basis. Formatting-only edits should be reviewable as non-semantic changes later; alpha may conservatively mark the context stale.

Revision changes must reflect a real requirement or scope change. The workflow must not create a new revision to ask more than three questions about the same unchanged feature.

## The user's visible experience

Show a short feature brief with the consequential assumptions and any questions. No extra mandatory approval dialog is required for recording already approved source criteria. New inferred requirements must remain distinguishable from explicit criteria.

After the feature is planned, the routine output stays short. Optional concerns are stored with `suggested`, `deferred` or `acknowledged` state. Re-notify only when a material change affects the acknowledged decision.
