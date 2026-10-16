# Roadmap and milestones

These are estimates for one experienced full-time developer. Exit evidence determines progress; dates do not override broken contracts.

## M0 - foundations and a small vertical slice (week 1)

- Repository setup, proposed MIT license, documented runtime versions and package scaffold.
- Canonical source/plan/decision/obligation/case/evidence contracts and exit codes.
- CLI initialization and local source import.
- Synthetic CSV-import sources and a tiny runnable fixture app started early.

Exit: import the example context, validate a hand-authored plan and run one ordinary check. No green verdict can be produced from a sample report.

## M1 - context to saved behavior plan (week 2)

- Relevant source bundle with provenance, conflict/unread-source states and missing context.
- Existing-agent workflow for brief, candidates and zero-to-three questions.
- Reusable decisions, stable IDs, required/deferred scope and plan freezing.
- Draft native integration recipe; user can drive the first workflow manually in either agent.

Exit: two new users complete the synthetic feature brief without founder narration; source-backed criteria and two consequential ambiguities are handled correctly.

## M2 - normal tests and trustworthy evidence (week 3)

- Reuse/generate Playwright tests with stable case bindings.
- Custom evidence reporter with retries, skips, expected failures and setup failures preserved.
- A real seeded duplicate-import/retry defect is reproduced and then fixed.
- Initial evidence freshness and denominator evaluator.

Exit: a test runs directly under Playwright, fails for the intended bug, and later passes after the product fix. A fake agent summary cannot satisfy the check.

## M3 - routine check and hook (week 4)

- Quiet terminal output plus JSON/Markdown reports; minimal local HTML if time permits.
- Complete/incomplete/fail semantics, budget expiry and stale-input handling.
- Opt-in reversible pre-push hook; relevant working-tree/pushed-revision mismatch detection.
- Saved-case replay in CI without model credentials.

Exit: repeat pushes ask no questions and make no model calls. The contract fixtures prevent false green.

## M4 - two agents and measured comparison (week 5)

- Package/test one shared workflow through native Claude Code and Codex skills.
- Supported operating systems and pinned tool versions documented.
- Held-out feature changes compared with native-agent baselines under equivalent context/budgets.
- Observe five design partners on repeated PRs.

Exit: both agent paths work from a clean setup; results and limitations are reproducible. No benchmark is invented from the demo alone.

## M5 - v0.1.0-alpha public release (week 6)

- Verified quickstart, resettable demo, issue/PR templates and contribution instructions.
- Actual npm/repository namespace reservation, final license, repository settings and release packaging.
- Real short demo video/screenshots from the labeled synthetic app.
- Published limitations, measured comparison and release notes.

Exit: a user can reproduce the supported example and understand what 100% covers, what remains unresolved and which operations are still unsupported.

## v0.2 candidates - choose from usage

Native PDF/DOCX text extraction; explicit GitHub issue importer using existing user auth; one additional source connector; multi-feature support; conservative impact-based selection; validated reuse of unaffected results; broader push-ref support; one more runner. Select the next item from repeated user friction, not theoretical completeness.

## Later product opportunities

Team history, shared ownership, policy review and hosted artifact retention are possible future services. They are not dependencies of a useful public repository or a complete local workflow.

## Signals to narrow the scope

If the tool adds more review work than useful cases, improve ranking and context before adding features. If setup support dominates, tighten the supported fixture path. If native agents match the result with less effort, keep CaseHatch as a small utility or refine the recurring task.
