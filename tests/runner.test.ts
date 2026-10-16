import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fixture, passing } from "./helpers.js";
import { applyPlan } from "../src/plans/index.js";
import { check } from "../dist/check.js";
import { loadConfig, atomicJson } from "../src/store.js";
import { latestReport } from "../src/reporting/index.js";

const prefix = "import {test,expect} from '@playwright/test';\n";
test("actual Playwright evidence distinguishes pass/failure/skip/expected-fail/no-assertion/swallowed/setup/timeout/retry", async () => {
  const f = fixture();
  try {
    const ids = [
      "PASS",
      "FAIL",
      "SKIP",
      "EXPECTED",
      "EMPTY",
      "SWALLOWED",
      "SETUP",
      "TIMEOUT",
      "FLAKY",
    ];
    const template = f.plan.cases[0]!;
    f.plan.cases = ids.map((id) => ({
      ...structuredClone(template),
      id: "CH-" + id,
    }));
    f.plan.obligations = ids.map((id) => ({
      id: "O-" + id,
      title: id,
      scope: "required",
      provenance: ["SRC-REQ#R1"],
      requiredCaseIds: ["CH-" + id],
    }));
    f.write(
      "tests/result.spec.ts",
      prefix +
        `
      test('pass',{tag:'@casehatch:CH-PASS'},async()=>{await test.step('casehatch:CH-PASS:result',async()=>{expect(1).toBe(1)});});
      test('fail',{tag:'@casehatch:CH-FAIL'},async()=>{await test.step('casehatch:CH-FAIL:result',async()=>{expect(2).toBe(1)});});
      test.skip('skip',{tag:'@casehatch:CH-SKIP'},async()=>{expect(1).toBe(1)});
      test('expected',{tag:'@casehatch:CH-EXPECTED'},async()=>{test.fail();await test.step('casehatch:CH-EXPECTED:result',async()=>{expect(2).toBe(1)});});
      test('empty',{tag:'@casehatch:CH-EMPTY'},async()=>{await test.step('casehatch:CH-EMPTY:result',async()=>{});});
      test('swallowed',{tag:'@casehatch:CH-SWALLOWED'},async()=>{await test.step('casehatch:CH-SWALLOWED:result',async()=>{try { expect(2).toBe(1) } catch {} });});
      test.describe('setup',()=>{test.beforeEach(()=>{throw Error('fixture unavailable')});test('blocked',{tag:'@casehatch:CH-SETUP'},async()=>{});});
      test('timeout',{tag:'@casehatch:CH-TIMEOUT'},async()=>{test.setTimeout(100);await new Promise(r=>setTimeout(r,1000));});
      test.describe('retry',()=>{test.describe.configure({retries:1});test('flaky',{tag:'@casehatch:CH-FLAKY'},async({},info)=>{await test.step('casehatch:CH-FLAKY:result',async()=>{expect(info.retry).toBe(1)});});});
    `,
    );
    applyPlan(f.root, f.plan);
    const r = await check(f.root, loadConfig(f.root), "feature", 30);
    const states = Object.fromEntries(
      r.caseResults.map((c) => [c.caseId, c.status]),
    );
    assert.deepEqual(states, {
      "CH-PASS": "passed",
      "CH-FAIL": "product_failed",
      "CH-SKIP": "skipped",
      "CH-EXPECTED": "blocked",
      "CH-EMPTY": "missing",
      "CH-SWALLOWED": "product_failed",
      "CH-SETUP": "blocked",
      "CH-TIMEOUT": "blocked",
      "CH-FLAKY": "flaky",
    });
    assert.equal(r.exitCode, 1);
    assert.equal(r.coverage.required, 9);
    assert.equal(r.coverage.executed, 3);
    assert.equal(r.coverage.passed, 1);
    assert.equal(
      r.caseResults.find((c) => c.caseId === "CH-FLAKY")!.attempts.length,
      2,
    );
    assert.equal(
      latestReport(f.root, loadConfig(f.root), "feature").verdict,
      "FAIL",
    );
  } finally {
    f.cleanup();
  }
});
test("every required case and project variant must execute; one passing member never completes an obligation", async () => {
  const f = fixture();
  try {
    f.plan.cases.push({
      ...structuredClone(f.plan.cases[0]!),
      id: "CH-MISSING",
    });
    f.plan.obligations[0]!.requiredCaseIds.push("CH-MISSING");
    f.plan.cases[0]!.binding.projects.push("second");
    f.write(
      "playwright.config.ts",
      "export default {testDir:'./tests',reporter:[['dot']],projects:[{name:'api'},{name:'second',grepInvert:/@casehatch/}]};",
    );
    applyPlan(f.root, f.plan);
    const r = await check(f.root, loadConfig(f.root), "feature", 20);
    assert.equal(r.exitCode, 2);
    assert.equal(r.coverage.planned, 0);
    assert.equal(r.coverage.executed, 0);
    assert.equal(r.coverage.passed, 0);
    assert.equal(r.coverage.required, 1);
    assert.ok(
      r.caseResults.some(
        (c) =>
          c.caseId === "CH-RESULT" &&
          c.project === "api" &&
          c.status === "passed",
      ),
    );
    assert.ok(
      r.caseResults.some(
        (c) => c.project === "second" && c.status === "missing",
      ),
    );
  } finally {
    f.cleanup();
  }
});
test("duplicate case bindings are adapter errors and illustrative evidence cannot be used", async () => {
  const f = fixture();
  try {
    f.write(
      "tests/result.spec.ts",
      passing() +
        "\ntest('duplicate',{tag:'@casehatch:CH-RESULT'},async()=>{});",
    );
    applyPlan(f.root, f.plan);
    const r = await check(f.root, loadConfig(f.root), "feature", 20);
    assert.equal(r.exitCode, 3);
    assert.equal(r.verdict, "ERROR");
    atomicJson(resolve(f.root, r.artifacts, "report.json"), {
      ...r,
      origin: "illustrative_not_executed",
    });
    assert.throws(
      () => latestReport(f.root, loadConfig(f.root), "feature"),
      /Illustrative/,
    );
  } finally {
    f.cleanup();
  }
});
test("fresh reports become stale after source/test/config/environment changes and stale context prevents execution", async () => {
  const f = fixture();
  try {
    const config = loadConfig(f.root);
    config.environmentKeys.push("CASEHATCH_TEST_ENV");
    atomicJson(resolve(f.root, "casehatch.config.json"), config);
    applyPlan(f.root, f.plan);
    const ready = await check(f.root, config, "feature", 20);
    assert.equal(ready.exitCode, 0);
    assert.equal(latestReport(f.root, config, "feature").verdict, "READY");
    f.write("app.ts", "export const changed = true;");
    assert.equal(latestReport(f.root, config, "feature").verdict, "INCOMPLETE");
    assert.equal((await check(f.root, config, "feature", 20)).exitCode, 0);
    process.env.CASEHATCH_TEST_ENV = "changed";
    assert.equal(latestReport(f.root, config, "feature").verdict, "INCOMPLETE");
    delete process.env.CASEHATCH_TEST_ENV;
    f.write("tests/result.spec.ts", passing() + "\n// modified\n");
    assert.equal(latestReport(f.root, config, "feature").coverage.executed, 0);
    f.write("requirements.md", "New business intent");
    const stale = await check(f.root, config, "feature", 20);
    assert.equal(stale.exitCode, 2);
    assert.equal(stale.caseResults[0]!.status, "stale");
    assert.equal(stale.caseResults[0]!.attempts.length, 0);
  } finally {
    delete process.env.CASEHATCH_TEST_ENV;
    f.cleanup();
  }
});
test("inputs changing during execution cannot be ready; existing reporters continue to run", async () => {
  const f = fixture();
  try {
    f.write(
      "custom-reporter.cjs",
      "const fs=require('fs');module.exports=class {onEnd(){fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/custom.txt','preserved')}}",
    );
    f.write(
      "playwright.config.ts",
      "export default {testDir:'./tests',reporter:[['./custom-reporter.cjs']],projects:[{name:'api'}]};",
    );
    f.write(
      "tests/result.spec.ts",
      prefix +
        "import {writeFileSync} from 'node:fs';test('mutation',{tag:'@casehatch:CH-RESULT'},async()=>{writeFileSync('app.ts','changed during run');await test.step('casehatch:CH-RESULT:result',async()=>expect(1).toBe(1));});",
    );
    applyPlan(f.root, f.plan);
    const r = await check(f.root, loadConfig(f.root), "feature", 20);
    assert.equal(r.exitCode, 2);
    assert.equal(r.caseResults[0]!.status, "stale");
    assert.match(r.problems.join(), /Inputs changed/);
    assert.equal(
      readFileSync(resolve(f.root, "test-results/custom.txt"), "utf8"),
      "preserved",
    );
  } finally {
    f.cleanup();
  }
});
test("budget stops unfinished execution without shrinking required scope", async () => {
  const f = fixture();
  try {
    f.write(
      "tests/result.spec.ts",
      prefix +
        "test('slow',{tag:'@casehatch:CH-RESULT'},async()=>{test.setTimeout(60000);await new Promise(r=>setTimeout(r,30000));});",
    );
    applyPlan(f.root, f.plan);
    const start = Date.now();
    const r = await check(f.root, loadConfig(f.root), "feature", 1.5);
    assert.equal(r.budgetExpired, true);
    assert.equal(r.exitCode, 2);
    assert.equal(r.coverage.required, 1);
    assert.equal(r.coverage.passed, 0);
    assert.ok(Date.now() - start < 7000);
  } finally {
    f.cleanup();
  }
});
test("empty scope and unresolved intent never become ready, even with a valid passing test", async () => {
  const f = fixture();
  try {
    f.plan.obligations = [];
    applyPlan(f.root, f.plan);
    const empty = await check(f.root, loadConfig(f.root), "feature", 10);
    assert.equal(empty.verdict, "NO_SCOPE");
    assert.equal(empty.coverage.passingPercent, null);
    assert.equal(empty.exitCode, 2);
    f.plan.scopeRevision = 2;
    f.plan.changeReason = "Add source-backed scope";
    f.plan.scopeChange = {
      reason: "Confirmed requirement",
      provenance: ["SRC-REQ#R1"],
    };
    f.plan.obligations = [
      {
        id: "O-RESULT",
        title: "Result",
        scope: "required",
        requiredCaseIds: ["CH-RESULT"],
        provenance: ["SRC-REQ#R1"],
      },
    ];
    f.plan.unresolved = ["Required retry outcome unknown"];
    applyPlan(f.root, f.plan);
    const unresolved = await check(f.root, loadConfig(f.root), "feature", 10);
    assert.equal(unresolved.exitCode, 2);
    assert.equal(unresolved.caseResults[0]!.attempts.length, 0);
  } finally {
    f.cleanup();
  }
});

test("unnamed projects and nested configuration preserve setup paths and original config bytes", async () => {
  const f = fixture();
  try {
    const config = loadConfig(f.root);
    config.runner.config = "config/playwright.config.ts";
    atomicJson(resolve(f.root, "casehatch.config.json"), config);
    const original =
      "export default {testDir:'../tests',globalSetup:'./setup.ts',reporter:[['dot']]};\n";
    f.write("config/playwright.config.ts", original);
    f.write(
      "config/setup.ts",
      "export default async ()=>{process.env.CASEHATCH_FIXTURE_READY='yes'};\n",
    );
    f.write(
      "tests/result.spec.ts",
      "import {test,expect} from '@playwright/test';test('uses existing setup',{tag:'@casehatch:CH-RESULT'},async()=>{await test.step('casehatch:CH-RESULT:result',async()=>{expect(process.env.CASEHATCH_FIXTURE_READY).toBe('yes')});});\n",
    );
    f.plan.cases[0]!.binding.projects = [""];
    applyPlan(f.root, f.plan);
    const r = await check(f.root, config, "feature", 20);
    assert.equal(r.exitCode, 0, JSON.stringify(r.problems));
    assert.equal(
      readFileSync(resolve(f.root, "config/playwright.config.ts"), "utf8"),
      original,
    );
  } finally {
    f.cleanup();
  }
});

test("a passing assertion cannot substitute for another required assertion mapping", async () => {
  const f = fixture();
  try {
    f.plan.cases[0]!.assertions.push({
      id: "recovery",
      description: "A distinct required recovery outcome",
    });
    applyPlan(f.root, f.plan);
    const r = await check(f.root, loadConfig(f.root), "feature", 20);
    assert.equal(r.exitCode, 2);
    assert.equal(r.caseResults[0]!.status, "missing");
    assert.equal(r.coverage.passed, 0);
  } finally {
    f.cleanup();
  }
});
