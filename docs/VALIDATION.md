# Reproducible local validation

Validation date: 16 October 2026 (Asia/Kolkata). Committed fixtures and source documents are synthetic. Private native-session trials are described separately below; their sources, prompts and artifacts are excluded from the repository and package.

| Tool / environment    | Local version                                     |
| --------------------- | ------------------------------------------------- |
| OS / architecture     | macOS / arm64                                     |
| Node.js               | v22.21.1                                          |
| npm                   | 10.9.4                                            |
| TypeScript            | 5.9.3                                             |
| Playwright            | 1.64.1 (default), 1.63.0 (compatibility suite)    |
| tsx                   | 4.23.15                                           |
| Zod                   | 4.6.7                                             |
| Commander             | 15.0.0                                            |
| Prettier              | 3.6.2                                             |
| Native agent sessions | Codex CLI 0.162.0-alpha.17.2; Claude Code 2.1.274 |

## Commands

From a clean checkout:

```sh
npm ci
npm run verify
npm run demo:bug
npm run smoke
npm run format:check
```

`verify` typechecks the package and tests, builds the CLI, executes contract tests with actual Playwright subprocesses, and runs the fixed synthetic fixture. `demo:bug` succeeds only when the deliberately broken retry behavior causes the normal CaseHatch check to exit 1. The saved requirement, denominator and test are unchanged between fixed/bug modes.

The 24-test contract suite passes locally on both Playwright 1.64.1 and 1.63.0. The compatibility run uses `CASEHATCH_TEST_RUNNER_MODULES` to select an isolated installed runner for fixture projects; runtime checks still resolve the project's own dependency. It covers exact case/project roll-up, zero scope, missing/duplicate bindings, no runtime assertions, skip, expected failure, caught assertion errors, fixture failure, test timeout, retry-pass with preserved attempts, stale source/test/application/environment inputs, mutation during execution, existing reporter preservation, budget termination, unresolved intent, frozen scope changes, question history, source import limits, user-edited skill preservation and hook composition/restoration/ref guards. MCP tests cover CLI provenance round-trip, explicit unknown versions, partial extraction, remote-resource identity, rejecting undeclared credential fields, offline reporter-backed replay, freshness after a snapshot refresh, and both native reference installations. These tests use synthetic remote metadata; they do not certify a live Atlassian connection.

The smoke script packs the actual compiled package and installs that tarball with its local peer in a new temporary directory. It verifies both native skill paths, idempotent init, unchanged user instructions, local context/plan apply, a READY reporter-backed check, standalone HTML export, direct Playwright replay, doctor, and hook/integration removal. It does not use source-directory imports or a published npm package.

## Private native-session trials

The packaged CLI and installed skill were also exercised through existing authenticated Codex and Claude Code sessions in isolated copies/worktrees of two existing projects. The original working files were hashed before and after the trials. No provider credentials were copied, and no live model-provider requests were used by either application fixture.

- **Codex / Python API:** a new TypeScript/Playwright API bridge exercised a documented Basic Auth requirement against the application's existing local fast-test mode. All four cases executed: two passed and two received HTTP 200 where HTTP 401 was required. CaseHatch returned **FAIL / exit 1**, with one of two required outcomes passing. This is a bounded contract failure in that local mode; it does not establish live-provider behavior or native pytest support. The configured Codex model was `gpt-6.1-sol` with `xhigh` effort; the event stream did not report the exact resolved model build.
- **Claude Code / TypeScript API:** the session was explicitly restricted to Sonnet at medium effort, with Sonnet as the only fallback. The observed model ID was `claude-sonnet-5`. Two cases verified a source-grounded token-redaction invariant against a dedicated, owned API fixture using an explicit fake provider. Each case confirmed the newly issued decision was present and correctly identified before checking token absence. CaseHatch returned **READY / exit 0**, with one of one required outcomes passing. An earlier recorded-viewer exercise establishes display behavior only and is not included in this result.

The trials exposed an unsupported Playwright 1.63.0 dependency in one project. Support was added and the full contract suite passed against that version before replay. An initial run also became **INCOMPLETE / exit 2** when generated Next.js files changed during execution; its passing attempts did not become passing coverage. Only the generated cache directory was subsequently excluded. Prior reports and frozen requirement history were retained.

These are narrow integration exercises, not clean-machine certification, a general semantic-planning benchmark, or a complete audit of either application. Private raw transcripts and reports remain local and cannot satisfy another project's gate. Live Atlassian MCP retrieval remains untested; its offline metadata and replay contracts are covered by synthetic tests.

The GitHub Actions workflow is configured for ubuntu-latest/macos-latest with Node 22/24 and Playwright 1.63.0/1.64.1. Its remote status must be established after pushing the repository; the configuration is not evidence that those jobs already ran. No Windows, held-out model comparison, design-partner study, browser UI benchmark or repeat-use study is claimed.

Run IDs, snapshots, attempts, elapsed times and logs are emitted locally under `examples/demo/.casehatch/runs/`. Run artifacts remain ignored rather than becoming public sample evidence. A consumer must execute its own check; neither this document nor illustrative JSON can satisfy a gate. No performance benchmark is inferred from these functional checks.
