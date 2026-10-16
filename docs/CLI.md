# CLI reference

Available in the local `0.1.0-alpha.1` package. Build/install from the checkout or tarball; there is no published npm release yet. All CLI operations are deterministic and noninteractive. Planning happens in the user's existing agent session.

Global flags can appear before or after subcommands: `--cwd DIRECTORY`, `--format text|json|markdown|html`, `--help`, `--version`. JSON mode writes one machine-readable result to stdout; runner output is saved in the run log. Markdown/HTML renderers apply to check/report.

| Command                                                                           | Behavior                                                                                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `init [--feature ID] [--config PATH] [--agent none\|codex\|claude\|both]`         | Create config, private-state ignores, and optionally owned project skills; preserve existing files     |
| `doctor`                                                                          | Read-only setup diagnostics; exit 2 when prerequisites are missing                                     |
| `context add --feature ID --id SRC-ID --file PATH --kind KIND [--origin LOCATOR]` | Import UTF-8 `.md`/`.txt`, record provenance and hash; kind is prd/brd/ticket/decision/invariant/other |
| `context import --feature ID --input PATH`                                        | Import an agent-normalized source manifest pointing at an existing text export                         |
| `context export --feature ID [--max-chars 24000] --format json`                   | Bounded source text, locators, extraction limits, source problems, and saved decisions/plan            |
| `plan validate PATH`                                                              | Strict schema, IDs, provenance links, cases, variants, and active decision-question limit              |
| `plan apply PATH`                                                                 | Also validate current context/history, freeze plan and scope digest; no model call                     |
| `plan show --feature ID`                                                          | Show the frozen plan                                                                                   |
| `check [--feature ID] [--budget 60s] [--details] [--out PATH]`                    | Execute all required saved cases, collect fresh evidence and compute readiness                         |
| `report [--feature ID] [--details] [--format json\|markdown\|html] [--out PATH]`  | Render latest local run, invalidate changed inputs; never execute tests                                |
| `hooks install --pre-push --feature ID`                                           | Opt-in owned wrapper for ordinary Git hooks                                                            |
| `hooks uninstall`                                                                 | Restore original hook if wrapper was not edited                                                        |
| `integrations uninstall`                                                          | Remove only unchanged owned agent skill files; preserve user edits and all plans/tests/config          |

`--feature` falls back to `activeFeature` in config. Context operations also need a selected feature. `init --agent none` is the default. Repeating init preserves config values; edit the config explicitly to change the active feature.

## Plans and context

See the [agent plan contract](../integrations/casehatch/references/plan.md), [JSON schemas](../schemas/plan.schema.json), and [working demo plan](../examples/demo/plan.json). The schema validates links, not the truth or completeness of business intent. `plan validate` checks a draft structurally; `plan apply` checks imports, source freshness, history and scope changes too. Unresolved plans can be saved but cannot pass a check.

A normalized import manifest contains:

```json
{
  "id": "SRC-TICKET",
  "kind": "ticket",
  "path": "context/ticket.txt",
  "origin": "https://example.test/tickets/EXAMPLE-1",
  "extraction": "excerpt",
  "limitations": ["Only acceptance criteria were exported"]
}
```

Extraction is complete/excerpt/summary/unreadable. Non-complete selected inputs remain visible and block alpha readiness. A missing source is recorded as unreadable instead of silently disappearing. The importer accepts no native PDF/DOCX or remote credentials. Use the existing agent's tools to make a source-preserving text export. Source IDs cannot be reassigned to another path.

For Jira/Confluence, the agent can use its existing harness's Atlassian MCP read/search tools and add an optional `retrieval` object. It records `method: "mcp"`, connection label `server`, actual `tools` (nonempty string array), `resourceType` (`jira-issue`, `confluence-page`, or `other`), `resourceId`, reported `version` and ISO `updatedAt` (each nullable when unavailable), and ISO `fetchedAt`. The import time remains separately recorded as `capturedAt`. See the [MCP workflow and full example](../integrations/casehatch/references/mcp.md).

Retrieval metadata is declared source provenance, not runner evidence. An existing MCP source keeps its path, canonical origin and remote resource identity; another resource needs a new ID. Refresh with `context import` and preserve retrieval metadata. `context add` cannot silently turn an MCP source into an ordinary local source. Updating retrieval metadata invalidates older reports, even for unchanged text. Updating text invalidates the plan's old source hash until reviewed and revised.

No CLI command contacts MCP or Atlassian. Remote exports expose `remoteFreshness: "not_checked_by_cli"`, and `report --details` shows the snapshot retrieval time. Local freshness verifies the imported version; only an agent-mediated refresh can discover subsequent live ticket/page edits. CI must have the same reviewed source snapshots available locally; missing files remain incomplete, without a live lookup or model credential.

A plan's first `scopeRevision` is 1. Subsequent revisions increment by exactly one and need `changeReason`. Changes to required scope, accepted outcomes/assertions or variants also need `scopeChange` with reason and source/answered-decision provenance. History remains in `.casehatch/features/ID/history/`. A revision counter alone cannot reset unchanged-source question accounting. The active plan contains at most three decision questions; older decisions can also be retained as a separately imported accepted-decision source when revisiting a changed feature. CLI accounting relies on honestly declared material questions and source changes; it cannot inspect prior conversations.

## Configuration

```json
{
  "schemaVersion": 1,
  "activeFeature": "csv-import",
  "runner": { "adapter": "playwright", "config": "playwright.config.ts" },
  "budgetSeconds": 60,
  "generatedDirectories": ["test-results", "playwright-report"],
  "environmentKeys": ["CI", "NODE_ENV"]
}
```

Add every behavior-affecting environment variable to `environmentKeys`. Reports store a combined hash of values, never values. Only exclude generated outputs. Required bound test files and imported sources cannot be excluded. Put custom reporter/build outputs in explicitly configured generated directories; source/config/test files belong in the fingerprint. The CLI fingerprints the project directory conservatively, not an inferred dependency graph. It caps snapshots at 20,000 files / 256 MiB, ignores node_modules, .git and local run/lock directories, and records Node/Playwright/platform versions. Dependency locks are part of the file fingerprint; mutable external services and unrecorded environment inputs are outside the guarantee.

Paths stay inside the project and source symlinks are unsupported. One package directory and one feature per check are supported. A local peer installation of Playwright 1.63.x–1.64.x is required. The temporary composed runner config sits beside the original to preserve relative path semantics, and is removed after execution; a copy stays with the run. Existing testDir/projects/fixtures/webServer/setup/reporter settings are retained. Required cases are selected through exact `@casehatch:ID` tags and explicit projects. Duplicate/ambiguous bindings fail with exit 3; missing variants are incomplete. Separate parameter combinations need separate case IDs. Browser tests need the application's normal browser installation.

## Reports and exit codes

`--format json` carries the canonical report and detailed attempts. HTML is standalone, has no scripts or remote resources, escapes input, and provides expandable case details. `--out PATH` preserves existing files and errors if the destination already exists; stdout redirection is available for deliberate replacement. Export into `.casehatch/runs/` so the export itself does not change the source fingerprint. Freshness is checked when reading a saved report.

| Exit | Meaning                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------- |
| 0    | Nonempty complete required passing scope, fresh evidence, resolved intent                                     |
| 1    | At least one isolated mapped required outcome assertion failed; simultaneous gaps remain visible              |
| 2    | No scope, unresolved intent, blocked/stale/missing/skipped/flaky/interrupted verification or exhausted budget |
| 3    | Invalid usage/configuration, unsupported operation, invalid schema or ambiguous bindings                      |

Readiness never comes from imported reports or illustrative JSON. Check always starts a new runner invocation. Expected-failure annotations do not satisfy passing behavior. A runtime `expect` must execute within every declared named outcome step. Playwright assertion events establish execution, not semantic correctness. Custom assertion libraries without Playwright expect events are unsupported. A mapped assertion failure is a failed behavior check; inspect the expected outcome and fixture before concluding it is a production bug.

The budget accepts `500ms`, `60s`, `2m`, or a number of seconds, up to 24 hours. It includes initial snapshot work and runner wall time. On expiry the runner process group is terminated, with up to 3 seconds for forced cleanup. Final snapshot and report I/O are additional. Partial evidence is saved; required cases are never trimmed. SIGINT/SIGTERM also save an incomplete result when the CLI can complete cleanup. A hard kill can leave a lock; remove `.casehatch/locks/write.lock` only after confirming no operation is running.

Artifacts: `.casehatch/runs/RUN-ID/report.json`, `events.jsonl`, `runner.log`, composed config, and runner attachment paths. There is no automatic artifact pruning in this MVP. These files are local and ignored; review/redact them before sharing.

## Hooks

Install only when requested. For a normal `.git/hooks/pre-push`, CaseHatch keeps the original file beside an owned wrapper. An executable original runs first with the same args and Git stdin; its failure remains a failure. Uninstall restores exact original bytes/mode and refuses to remove an edited wrapper. Moving/reinstalling the package can invalidate the stored CLI path; uninstall/reinstall the hook after moving it.

Existing `core.hooksPath`/Husky managers are left untouched. Integrate the command `npx --no-install casehatch hook --feature ID` in your manager's pre-push script and forward the ref lines Git supplied on stdin. If other checks consume stdin, capture and forward it to each check. This internal hook entry enforces the same ref/clean-tree checks as the installer. Keep your existing hook manager's setup and failure behavior.

Alpha verifies one current HEAD branch push, at the Git root, with no tracked or untracked changes. Tags, deletions, multiple refs, non-HEAD pushes, symlink hooks, external hook paths, worktree layouts with external hook storage and nested project roots are unsupported. Runtime/source/config/test files absent from the pushed commit, including ignored local build/env files, block hook verification; private normalized context caches are exempt because the committed manifests and original source hashes are validated. Use explicit configured environment variables for local configuration. The hook never stashes, commits, asks a question, calls a model, changes scope or fixes a failing test.

CI should replay the same saved checks with committed sources, plans, tests, config and installed fixture dependencies:

```sh
npm ci
npx --no-install casehatch check --feature csv-import --budget 2m
```

No model credential is needed. A local hook is optional convenience, not a substitute for CI enforcement.
