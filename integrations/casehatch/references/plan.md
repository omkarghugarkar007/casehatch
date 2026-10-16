# Saved plan contract (schemaVersion 1)

The CLI is installed as a development dependency: use `npx --no-install casehatch ...` when `casehatch` is not on PATH. From the CaseHatch checkout use `node /path/to/casehatch/dist/cli/index.js --cwd /path/to/project ...`. `--format json` works before or after subcommands.

Initialize with `casehatch init --agent both --feature feature-id`; this preserves existing config and instructions. Register UTF-8 Markdown/text with:

```sh
casehatch context add --feature feature-id --id SRC-PRD --file docs/PRD.md --kind prd
casehatch context export --feature feature-id --format json
```

For normalized remote/PDF/DOCX content, save a text export in the project and import a manifest containing `id`, `kind`, `path`, `origin`, `extraction` (complete/excerpt/summary/unreadable), and `limitations` (string array). Alpha gates require complete selected sources; partial material stays visible and incomplete. Never label a summary as a complete extraction.

For Jira/Confluence or another existing harness MCP connection, use [the MCP workflow](mcp.md). The manifest can additionally carry `retrieval` provenance with the actual read tools, resource identity, reported revision/update time, and retrieval time. Unknown remote versions/update times are explicit nulls. Refresh through the agent session; checks validate the saved version without calling MCP.

A minimal draft (replace the source hash with the imported value; preserve real intent):

```json
{
  "schemaVersion": 1,
  "featureId": "feature-id",
  "title": "Source-backed feature",
  "scopeRevision": 1,
  "brief": {
    "goal": "Documented outcome",
    "actors": ["User"],
    "rules": ["The source rule"],
    "exclusions": []
  },
  "sources": [{ "id": "SRC-PRD", "sha256": "COPY_THE_IMPORTED_SHA256" }],
  "decisions": [],
  "obligations": [
    {
      "id": "O-RESULT",
      "title": "Documented result",
      "scope": "required",
      "provenance": ["SRC-PRD#L12"],
      "requiredCaseIds": ["CH-RESULT"]
    }
  ],
  "cases": [
    {
      "id": "CH-RESULT",
      "title": "Concrete input produces result",
      "expectedOutcome": "Source-backed observable result",
      "provenance": ["SRC-PRD#L12"],
      "binding": { "file": "tests/result.spec.ts", "projects": ["chromium"] },
      "assertions": [
        { "id": "result", "description": "The observable business outcome" }
      ]
    }
  ],
  "unresolved": [],
  "conflicts": [],
  "deferredConcerns": []
}
```

Required scope is explicit. Other obligation `scope` values are candidate/deferred/excluded and require a reason. Consequential uncertainty goes in `unresolved` or `conflicts`, both arrays of strings; these block readiness. Decisions have stable `id`, one material `question`, optional `answer`, and `provenance` source references. An unanswered decision blocks readiness; it cannot ground a required outcome until answered. Every provenance entry is `SOURCE-ID#locator` or an answered decision ID. Locators should identify actual source lines, headings or ticket criteria; the validator verifies linkage, not semantic truth.

Bind each test to one case:

```ts
import { test, expect } from "@playwright/test";
test("documented result", { tag: "@casehatch:CH-RESULT" }, async ({ page }) => {
  // Reuse normal application setup/fixtures and exercise the real action.
  await test.step("casehatch:CH-RESULT:result", async () => {
    await expect(page.getByRole("status")).toHaveText("The required result");
  });
});
```

Each declared assertion ID must execute an expect call inside its matching step. A test can cover multiple obligations by referencing its one case ID from several obligations. A project name of `""` binds the default unnamed Playwright project. Separate parameter combinations into separate IDs; duplicate bindings are rejected. Passing fixtures or helper calls outside a named step do not substitute for the outcome assertion. Node assert/custom matcher systems without Playwright expect events are unsupported in this alpha.

`plan validate PATH` validates structure; `plan apply PATH` also checks current imported sources and history. Later revisions must increment by one and include `changeReason`. Changing accepted outcomes/assertions/required variants or scope also requires `scopeChange: { "reason": "why intent changed", "provenance": ["SRC-DECISION#locator"] }`. Preserve stable IDs, previous decisions and accepted scope. Do not create a revision to hide a failure or reset unchanged-context questions.

Run `casehatch check --feature feature-id --budget 60s`. Exit codes: 0 complete pass, 1 mapped outcome assertion failure, 2 incomplete verification (including no scope), 3 invalid usage/config/adapter binding. Inference, hook prompts and automatic scope trimming are absent. Re-read sources and revise the plan when evidence is stale. Configure environment keys affecting app behavior in `casehatch.config.json`; only hashes of their values are recorded.
