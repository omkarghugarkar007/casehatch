import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const repo = fileURLToPath(new URL("../", import.meta.url));
const root = realpathSync(mkdtempSync(resolve(tmpdir(), "casehatch-package-")));
function command(bin, args, cwd = root, expected = 0) {
  const r = spawnSync(bin, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  assert.equal(
    r.status,
    expected,
    `${bin} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`,
  );
  return r.stdout;
}
try {
  const packed = JSON.parse(
    command("npm", ["pack", "--ignore-scripts", "--json"], repo),
  )[0];
  const tarball = resolve(repo, packed.filename);
  writeFileSync(
    resolve(root, "package.json"),
    JSON.stringify({
      name: "synthetic-package-smoke",
      private: true,
      type: "module",
    }),
  );
  command("npm", [
    "install",
    "--no-audit",
    "--no-fund",
    "--save-dev",
    tarball,
    "@playwright/test@1.64.1",
  ]);
  const bin = resolve(root, "node_modules/.bin/casehatch");
  writeFileSync(resolve(root, "AGENTS.md"), "Keep existing instructions.\n");
  writeFileSync(
    resolve(root, "playwright.config.ts"),
    "export default {testDir:'./tests',projects:[{name:'api'}],reporter:[['dot']]};\n",
  );
  command(bin, ["init", "--agent", "both", "--feature", "smoke"]);
  command(bin, ["init", "--agent", "both"]);
  assert.equal(
    readFileSync(resolve(root, "AGENTS.md"), "utf8"),
    "Keep existing instructions.\n",
  );
  for (const provider of [".agents", ".claude"])
    assert.ok(
      readFileSync(
        resolve(root, provider, "skills/casehatch/references/mcp.md"),
        "utf8",
      ).includes("existing harness MCP"),
    );
  mkdirSync(resolve(root, "tests"));
  writeFileSync(
    resolve(root, "tests/smoke.spec.ts"),
    "import {test,expect} from '@playwright/test';test('observable outcome',{tag:'@casehatch:CH-SMOKE'},async()=>{await test.step('casehatch:CH-SMOKE:result',async()=>expect(2+2).toBe(4));});\n",
  );
  const source = "# Required outcome\nThe synthetic result is four.\n";
  writeFileSync(resolve(root, "requirements.md"), source);
  command(bin, [
    "context",
    "add",
    "--id",
    "SRC-REQ",
    "--kind",
    "prd",
    "--file",
    "requirements.md",
  ]);
  const plan = {
    schemaVersion: 1,
    featureId: "smoke",
    title: "Synthetic package smoke",
    scopeRevision: 1,
    brief: {
      goal: "Verify the installed package",
      actors: ["developer"],
      rules: ["Synthetic outcome"],
      exclusions: [],
    },
    sources: [
      {
        id: "SRC-REQ",
        sha256: createHash("sha256").update(source).digest("hex"),
      },
    ],
    decisions: [],
    obligations: [
      {
        id: "O-SMOKE",
        title: "Required outcome",
        scope: "required",
        provenance: ["SRC-REQ#L2"],
        requiredCaseIds: ["CH-SMOKE"],
      },
    ],
    cases: [
      {
        id: "CH-SMOKE",
        title: "Concrete result",
        expectedOutcome: "Result is four",
        provenance: ["SRC-REQ#L2"],
        binding: { file: "tests/smoke.spec.ts", projects: ["api"] },
        assertions: [{ id: "result", description: "Result is four" }],
      },
    ],
    unresolved: [],
    conflicts: [],
    deferredConcerns: [],
  };
  writeFileSync(resolve(root, "plan.json"), JSON.stringify(plan));
  command(bin, ["plan", "apply", "plan.json"]);
  const report = JSON.parse(command(bin, ["check", "--format", "json"]));
  assert.equal(report.verdict, "READY");
  assert.equal(report.coverage.passed, 1);
  command(bin, [
    "report",
    "--format",
    "html",
    "--out",
    ".casehatch/runs/report.html",
  ]);
  assert.match(
    readFileSync(resolve(root, ".casehatch/runs/report.html"), "utf8"),
    /<!doctype html>/,
  );
  command(resolve(root, "node_modules/.bin/playwright"), ["test"]);
  command(bin, ["doctor"]);
  command("git", ["init", "-b", "main"]);
  command("git", ["config", "user.name", "Synthetic Test"]);
  command("git", ["config", "user.email", "synthetic@example.test"]);
  writeFileSync(
    resolve(root, ".gitignore"),
    "node_modules/\ntest-results/\nplaywright-report/\n",
  );
  command("git", ["add", "."]);
  command("git", ["commit", "-qm", "synthetic fixture"]);
  command(bin, ["hooks", "install", "--pre-push"]);
  command(bin, ["hooks", "uninstall"]);
  command(bin, ["integrations", "uninstall"]);
  rmSync(tarball);
  console.log(
    "Package smoke passed: isolated tarball install, both skills, replay, direct Playwright, HTML, doctor, hook lifecycle.",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
