# CaseHatch

[![Verify](https://github.com/omkarghugarkar007/casehatch/actions/workflows/ci.yml/badge.svg)](https://github.com/omkarghugarkar007/casehatch/actions/workflows/ci.yml)

**Behavior checks before you push.**

Turn PRDs, tickets, and accepted decisions into focused behavior checks that your coding agent can save and Playwright can replay.

CaseHatch keeps the agreed outcomes, their sources, and the tests checking them together. Your existing Codex or Claude Code session handles discovery. The CLI runs saved tests and reports what was actually exercised, passed, or left incomplete—without a model call, an account, or an API key.

**Working MVP · `0.1.0-alpha.1` · TypeScript + Playwright 1.63.x–1.64.x · Node.js ≥22.12 · macOS/Linux.** Not yet published to npm. GitHub CI is included; broader platform validation remains pending. [Implementation status and limits](docs/STATUS.md).

Use it when your agent has implemented a feature and you want to check whether the tests cover the agreed behavior. CaseHatch connects each outcome to its source and actual execution evidence, so an omitted retry case or a skipped test stays visible.

## Try it from a checkout

```sh
git clone https://github.com/omkarghugarkar007/casehatch.git
cd casehatch
npm ci
npm run demo
npm run demo:bug
```

No browser download is needed for the synthetic API demo. `demo` runs seven ordinary Playwright cases covering five agreed outcomes: valid import, duplicate/retry identity, atomic validation, tenant isolation, and a 10 MiB size boundary.

Fixed mode produces:

```text
Behavior checks: 5/5 passed — 100% of agreed scope (revision 1).
```

Bug mode enables a deliberately broken retry guard in the synthetic app. The existing happy-path test still passes. The saved retry case observes HTTP 201 instead of the required HTTP 200 and fails:

```text
FAIL: 5/5 outcomes exercised; 4/5 passed (revision 1).
  CH-CSV-003 [api] product_failed: A Playwright assertion failed inside a mapped outcome step.
```

`npm run demo:bug` itself exits 0 only when it successfully reproduces the expected exit-1 check. `npm run demo` restores fixed mode. Both modes run the same scope and tests. [Full walkthrough](examples/demo/README.md).

## Use it in your project

Install the [GitHub alpha release](https://github.com/omkarghugarkar007/casehatch/releases/tag/v0.1.0-alpha.1) in an existing Playwright project:

```sh
npm install -D https://github.com/omkarghugarkar007/casehatch/releases/download/v0.1.0-alpha.1/casehatch-0.1.0-alpha.1.tgz
npx --no-install casehatch init --agent both --feature csv-import
npx --no-install casehatch context add --feature csv-import \
  --id SRC-PRD --file docs/PRD.md --kind prd
```

Keep your existing supported Playwright version. If your project does not have Playwright yet, first run `npm install -D @playwright/test@1.64.1`. To build the package yourself, run `npm run build && npm pack` in this checkout and install the resulting tarball in your application.

Install only the agent skill you use with `--agent codex` or `--agent claude`. Init preserves existing config, hooks, and agent instructions. It writes project skills to `.agents/skills/casehatch` and `.claude/skills/casehatch`; reopen/reload the agent session if the skill is not discovered.

Ask your agent:

> Use CaseHatch to plan behavior checks for csv-import from the registered sources. Reuse existing decisions, fixtures, and tests. Save source-grounded required outcomes, record uncertainty, and implement normal Playwright tests. Ask at most three material questions if needed.

The agent exports context, writes a draft, then uses `plan validate` and `plan apply`. There is no nested agent process. Planning can also be done manually using the [plan contract](integrations/casehatch/references/plan.md) and [working demo plan](examples/demo/plan.json).

For Jira tickets and linked Confluence PRDs, reuse the Atlassian MCP connection already available in your coding-agent harness:

> Use CaseHatch for Jira CSV-17 and its linked requirements through the MCP tools already connected to this session. Reuse accepted decisions, save source-preserving snapshots with retrieval metadata, and plan the required checks.

Both installed skills include the [existing-harness MCP workflow](integrations/casehatch/references/mcp.md). The agent retrieves the relevant source content; `context import` retains its URL, resource ID, reported version/update time, tool names and retrieval time. CaseHatch adds no Atlassian login or MCP client. Checks/hooks/CI replay verify the imported snapshot offline. A passing check describes that imported version; it does not establish that the live ticket/page is unchanged. Refresh remote sources in the agent session when revisiting a feature.

Replay the saved checks locally or in CI:

```sh
npx --no-install casehatch check --feature csv-import
npx --no-install casehatch report --feature csv-import --details
npx --no-install casehatch report --feature csv-import --format json
npx --no-install casehatch report --feature csv-import --format html \
  > .casehatch/runs/report.html
```

## Keep your tests

CaseHatch uses ordinary Playwright files and fixtures. A stable tag identifies a case; named steps map real runtime assertions to the outcome:

```ts
import { test, expect } from "@playwright/test";

test(
  "retry returns the existing job",
  { tag: "@casehatch:CH-RETRY" },
  async ({ request }) => {
    // Use your normal authenticated tenant and import data fixture.
    const headers = {
      "x-tenant": "synthetic-tenant",
      "idempotency-key": "retry-1",
      "content-type": "text/csv",
    };
    const data = "name,email\nAlex,alex@example.test\n";
    const original = await request.post("/imports", { headers, data });
    const originalJobId = (await original.json()).id;
    const retry = await request.post("/imports", { headers, data });
    await test.step("casehatch:CH-RETRY:identity", async () => {
      expect(retry.status()).toBe(200);
      expect((await retry.json()).id).toBe(originalJobId);
    });
  },
);
```

The snippet shows the binding convention; adapt authentication, isolated test data and baseURL to your existing fixtures. Tests remain runnable through `npx playwright test`. Existing reporters and runner config are composed with CaseHatch's evidence reporter.

## What green means

Coverage counts **agreed business outcomes**, not test files or lines of code. One outcome can require several cases and project variants; every required member must pass freshly. Plans freeze that denominator and preserve revision history. Changes to accepted outcomes, assertions, or required scope require a source-backed scope-change record.

A failure can count as exercised without counting as passed. A missing case, removed assertion, skip, expected failure, retry-pass, fixture failure, changed source, interrupted run, or exhausted budget cannot count as a complete passing result. Empty scope is `NO_SCOPE`, with null percentages. Reports distinguish planning, execution, and passing shares.

The CLI verifies structure, source hashes, exact bindings, runtime assertion events, and freshness. **It cannot prove that an assertion expresses the right business intent or that every important scenario was discovered.** That remains a source-grounded review task. [Coverage contract](docs/COVERAGE.md).

| Exit | Meaning                                                                                      |
| ---- | -------------------------------------------------------------------------------------------- |
| 0    | Complete, fresh passing required scope                                                       |
| 1    | Required mapped outcome assertion failed; other gaps remain visible                          |
| 2    | Incomplete verification, including no scope, stale context, skips, retries, or budget expiry |
| 3    | Invalid usage/configuration or ambiguous adapter bindings                                    |

## Optional pre-push check

```sh
npx --no-install casehatch hooks install --pre-push --feature csv-import
npx --no-install casehatch hooks uninstall
```

The wrapper runs an existing executable hook first and forwards Git's ref input to both. It verifies one current HEAD branch push from a clean working tree. Multi-ref pushes, tags, deletion, non-HEAD refs, existing hook-manager paths, ignored runtime files, symlink hooks, and nested project roots are unsupported. User-edited wrappers are preserved on uninstall. [Hook details](docs/CLI.md#hooks).

## Local files and privacy

Commit the config, reviewed feature metadata/history, and ordinary tests when appropriate. `.casehatch/.gitignore` excludes raw context snapshots, run artifacts, and locks. Plans can contain private requirements: review them before committing. Imported documents are data; no CaseHatch service receives them. Your chosen agent provider processes whatever context you supply to its session.

The alpha conservatively fingerprints project files, source/plan/test/config content, lockfiles, Node/Playwright versions, and configured environment keys. Set every behavior-affecting variable in `environmentKeys`. Put only generated outputs in `generatedDirectories`; excluded files and external mutable services are outside the freshness guarantee. No saved evidence is reused to skip a check.

## Development

```sh
npm ci
npm run verify       # types, contract tests, actual runner tests, fixed demo
npm run demo:bug     # reproduce the deliberate defect
npm run smoke       # install the packed package in an isolated project
npm run format:check
```

[CLI reference](docs/CLI.md) · [Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [MIT license](LICENSE)

Try the synthetic demo, then bring one real feature with an accepted requirement. Share first-run friction and missing scenarios in [Discussions](https://github.com/omkarghugarkar007/casehatch/discussions), or file a [reproducible bug](https://github.com/omkarghugarkar007/casehatch/issues/new?template=bug_report.yml). Keep shared inputs synthetic or redacted. Small contribution paths are listed in [CONTRIBUTING.md](CONTRIBUTING.md).

The original product plans remain in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [docs/BACKLOG.md](docs/BACKLOG.md). Held-out comparisons and repeated-user validation are still pending; no speed or universal-coverage claim is made.
