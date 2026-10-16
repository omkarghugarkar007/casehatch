import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initialize } from "../src/init.js";
import { addSource } from "../src/context/index.js";
import type { Plan } from "../src/contracts.js";
export const repository = fileURLToPath(new URL("../", import.meta.url));
export function fixture() {
  const root = realpathSync(mkdtempSync(resolve(tmpdir(), "casehatch-test-")));
  symlinkSync(
    process.env.CASEHATCH_TEST_RUNNER_MODULES ??
      resolve(repository, "node_modules"),
    resolve(root, "node_modules"),
    "dir",
  );
  function write(path: string, content: string) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    writeFileSync(resolve(root, path), content);
  }
  write("package.json", JSON.stringify({ type: "module", private: true }));
  write(
    "playwright.config.ts",
    `export default {testDir:'./tests',reporter:[['dot']],timeout:1500,workers:1,projects:[{name:'api'}]};`,
  );
  initialize(root, "none", "feature");
  write("requirements.md", "# R1\nAn input produces the accepted result.\n");
  const source = addSource(root, "feature", {
    id: "SRC-REQ",
    kind: "prd",
    path: "requirements.md",
  });
  const plan: Plan = {
    schemaVersion: 1,
    featureId: "feature",
    title: "Synthetic feature",
    scopeRevision: 1,
    brief: {
      goal: "Accepted result",
      actors: ["user"],
      rules: ["R1"],
      exclusions: [],
    },
    sources: [{ id: source.id, sha256: source.sha256 }],
    decisions: [],
    obligations: [
      {
        id: "O-RESULT",
        title: "Accepted result",
        scope: "required",
        provenance: ["SRC-REQ#R1"],
        requiredCaseIds: ["CH-RESULT"],
      },
    ],
    cases: [
      {
        id: "CH-RESULT",
        title: "Concrete input",
        expectedOutcome: "Accepted result occurs",
        provenance: ["SRC-REQ#R1"],
        binding: { file: "tests/result.spec.ts", projects: ["api"] },
        assertions: [{ id: "result", description: "Accepted result occurs" }],
      },
    ],
    unresolved: [],
    conflicts: [],
    deferredConcerns: [],
  };
  write("tests/result.spec.ts", passing());
  return {
    root,
    write,
    plan,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
export function passing(id = "CH-RESULT") {
  return `import {test,expect} from '@playwright/test'; test('accepted result',{tag:'@casehatch:${id}'},async()=>{await test.step('casehatch:${id}:result',async()=>{expect(1).toBe(1);});});`;
}
