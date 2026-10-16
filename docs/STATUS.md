# Implementation status

Updated 16 October 2026. **Working local MVP: `0.1.0-alpha.1`.** The repository began as a planning package. The original [implementation plan](../IMPLEMENTATION_PLAN.md), [backlog](BACKLOG.md), and design documents remain as a baseline; this document records what exists now.

## Available

- A compiled, installable TypeScript CLI and locked npm dependencies, MIT license, generated editor schemas, stable exit codes and JSON errors.
- Idempotent initialization, read-only doctor, local Markdown/text import, normalized-source manifests, hashes/origins/extraction limits, bounded context export and decision reuse guidance.
- An existing-harness MCP workflow for Jira/Confluence and other connected sources, with validated resource/version/tool/retrieval provenance, offline replay, and explicit remote-freshness limits. Both native skills package the workflow; actual live MCP retrieval still needs a connected-session exercise.
- Strict plan validation, required/candidate/deferred/excluded scope, source/answered-decision linkage, frozen digests, revision history, required-scope change records and unchanged-source question accounting.
- Local Playwright execution using normal fixtures/tests, exact tags/files/projects, named runtime assertion mappings, preserved reporters/configuration, append-only attempt evidence, budget and signal cleanup.
- Conservative source/plan/test/config/project/environment fingerprints, current-report freshness checks, honest obligation-level planning/execution/passing counts, and explicit no-scope/failure/incomplete states.
- Quiet terminal output, canonical JSON, Markdown and standalone expandable HTML reports.
- Optional reversible ordinary Git pre-push wrapper, clean HEAD/ref checks, existing-hook stdin/failure preservation, and manual integration for existing hook managers.
- One shared skill packaged for Codex and Claude Code; owned files are removed only if unchanged. User instruction files remain untouched.
- A resettable synthetic API app with seven required Playwright cases, five agreed outcomes, a passing pre-existing happy-path test and an opt-in retry defect.
- Actual runner/negative/freshness/history/hook tests, isolated package installation smoke, and a GitHub Actions matrix for Linux/macOS on Node 22/24.

## Evidence and remaining acceptance work

[Local validation](VALIDATION.md) records exact versions and reproducible commands. The implementation exercises the deterministic slice of CH-001–CH-019. Both native agent workflows have bounded private integration trials with actual application execution. Semantic planning quality has not been evaluated as a completed user study or held-out comparison.

| Backlog work                               | Current state                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 foundations / synthetic app             | Implemented and locally verified                                                                                                                   |
| M1 context / decisions / plans             | Deterministic contracts implemented; bounded native trials reviewed; broader proposal quality and source conflict evaluation pending               |
| M2 runner / freshness / coverage           | Implemented and locally verified against actual runner results                                                                                     |
| M3 reports / CI / hook / false-green tests | Implemented; GitHub-hosted CI still needs its first remote run                                                                                     |
| CH-017 native skills                       | Packaged, schema-validated, smoke-tested; exercised through real Codex and Sonnet/medium Claude Code sessions; clean-machine certification pending |
| CH-020 held-out comparison                 | Pending: 20 changes / 3 repositories, matched agent baselines, repeated runs                                                                       |
| CH-021 platform validation                 | Clean tarball verified locally on macOS ARM64 / Node 22; Linux and Node 24 are configured in CI but not claimed as locally run                     |
| CH-022 public demo                         | Working commands and actual seeded-defect reproduction; no edited video or benchmark claim                                                         |
| CH-023 community                           | Public repository, MIT license, templates, Discussions, private vulnerability reporting and three scoped contributor issues ready                  |
| CH-024 release / repeated users            | Pending: namespace reservation, public release, design partners and retention research                                                             |

## Supported boundary

One project directory, one selected feature, complete local text sources, explicit Playwright projects, one concrete case per test binding and Playwright expect assertions inside named outcome steps. macOS/Linux are the intended execution targets. Node ≥22.12 and Playwright 1.63.x–1.64.x are enforced; other runner releases are not silently accepted. Browser-backed checks require the app's normal browser binaries. The demo uses HTTP fixtures and needs none.

The alpha does not support arbitrary monorepo discovery, symlinked source trees, multiple features per gate, perfect dependency selection, result reuse across changes, imported report evidence, native document extraction, semantic assertion proofs, custom assertion libraries, hosted dashboards, production exploration, automatic requirement rewriting or inference inside checks/hooks. Snapshot limits are 20,000 files / 256 MiB. Artifacts are not automatically pruned.

Freshness covers the recorded project files and configured environment recipe. Put only generated outputs in exclusions. Mutable external systems, undisclosed behavior flags and semantic source authority require review. Active plan decision questions are capped at three, with history preventing revision-only resets; the CLI cannot verify what was said outside its records or whether a declared question bundles several questions.

Hooks additionally require an ordinary Git-root project, one current HEAD branch push, a clean tree and committed runtime inputs. Tags/deletions/multiple refs/non-HEAD refs, ignored runtime/build/env files, source symlinks and configured hook-manager paths need a documented manual or later integration. Existing hook managers are preserved. Hook failures are never bypassed automatically.

This MVP is usable for the documented local workflow. Broader alpha graduation and product-quality claims remain gated on the original external acceptance work.
