import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyPlan, loadPlan, validatePlan } from "../src/plans/index.js";
import { addSource, exportContext } from "../src/context/index.js";
import { initialize, uninstallIntegrations } from "../src/init.js";
import { fixture } from "./helpers.js";

test("source provenance, empty mappings, illustrative plans and orphan references fail validation", () => {
  const f = fixture();
  try {
    const p = structuredClone(f.plan);
    p.obligations[0]!.requiredCaseIds = [];
    assert.throws(() => validatePlan(p), /at least one concrete case/);
    p.obligations[0]!.requiredCaseIds = ["NONEXISTENT"];
    assert.throws(() => validatePlan(p), /unknown case/);
    p.obligations[0]!.provenance = ["GUESS"];
    assert.throws(() => validatePlan(p), /provenance/);
    assert.throws(() => validatePlan({ ...f.plan, exampleOnly: true }));
    assert.throws(
      () =>
        validatePlan({ ...f.plan, cases: [...f.plan.cases, ...f.plan.cases] }),
      /Duplicate case/,
    );
  } finally {
    f.cleanup();
  }
});
test("frozen scope is idempotent; accepted requirements cannot disappear without an intent change record", () => {
  const f = fixture();
  try {
    const first = applyPlan(f.root, f.plan);
    assert.equal(applyPlan(f.root, f.plan).digest, first.digest);
    const p = structuredClone(f.plan);
    p.scopeRevision = 2;
    p.changeReason = "Review required scope";
    p.obligations[0]!.scope = "deferred";
    p.obligations[0]!.reason = "Specifically deferred by revised source";
    assert.throws(() => applyPlan(f.root, p), /scopeChange/);
    p.scopeChange = {
      reason: "Source-backed scope change",
      provenance: ["SRC-REQ#R1"],
    };
    const next = applyPlan(f.root, p);
    assert.equal(next.previousDigest, first.digest);
    assert.match(next.scopeDelta.join(), /removed from required/);
    assert.equal(loadPlan(f.root, "feature").plan.scopeRevision, 2);
    assert.ok(
      existsSync(resolve(f.root, ".casehatch/features/feature/history/1.json")),
    );
  } finally {
    f.cleanup();
  }
});
test("a revision cannot evade three-question accounting or discard accepted answers", () => {
  const f = fixture();
  try {
    f.plan.decisions = [1, 2, 3].map((n) => ({
      id: "DEC-" + n,
      question: "Material question " + n,
      answer: "Accepted answer " + n,
      provenance: ["SRC-REQ#R1"],
    }));
    applyPlan(f.root, f.plan);
    const p = structuredClone(f.plan);
    p.scopeRevision = 2;
    p.changeReason = "Another revision";
    p.decisions[0]!.question = "Fourth question";
    assert.throws(() => applyPlan(f.root, p), /three-question/);
    p.decisions = structuredClone(f.plan.decisions);
    p.decisions[0]!.answer = "Changed";
    assert.throws(() => applyPlan(f.root, p), /Reuse DEC-1/);
    p.decisions = [];
    assert.throws(() => applyPlan(f.root, p), /Reuse DEC-1/);
  } finally {
    f.cleanup();
  }
});
test("context retains unreadable/partial sources, truncation, origins and source changes", () => {
  const f = fixture();
  try {
    const missing = addSource(f.root, "feature", {
      id: "SRC-MISSING",
      path: "missing.md",
      kind: "other",
    });
    assert.equal(missing.extraction, "unreadable");
    const part = addSource(f.root, "feature", {
      id: "SRC-PART",
      path: "requirements.md",
      kind: "ticket",
      extraction: "excerpt",
      origin: "https://example.test/T-1",
      limitations: ["Only one section exported"],
    });
    assert.equal(part.origin, "https://example.test/T-1");
    assert.throws(
      () =>
        applyPlan(f.root, {
          ...f.plan,
          sources: [...f.plan.sources, { id: part.id, sha256: part.sha256 }],
        }),
      /excerpt/,
    );
    const bundle = exportContext(f.root, "feature", 10);
    assert.ok(bundle.sources.some((s) => s.truncated));
    assert.ok(bundle.problems.some((p) => p.includes("unreadable")));
    f.write("requirements.md", "Changed intent");
    assert.throws(() => applyPlan(f.root, f.plan), /source changed/);
    assert.throws(
      () =>
        addSource(f.root, "feature", {
          id: "SRC-ESCAPE",
          path: "../private.md",
          kind: "other",
        }),
      /outside project/,
    );
  } finally {
    f.cleanup();
  }
});
test("agent installation is idempotent and uninstall preserves user edits/instructions", () => {
  const f = fixture();
  try {
    f.write("AGENTS.md", "Keep my rules");
    initialize(f.root, "both", "feature");
    const path = ".agents/skills/casehatch/SKILL.md";
    const original = readFileSync(resolve(f.root, path), "utf8");
    initialize(f.root, "both");
    assert.equal(readFileSync(resolve(f.root, path), "utf8"), original);
    f.write(path, original + "\nUser customization\n");
    const removed = uninstallIntegrations(f.root);
    assert.ok(removed.preserved.includes(path));
    assert.ok(existsSync(resolve(f.root, path)));
    assert.equal(
      readFileSync(resolve(f.root, "AGENTS.md"), "utf8"),
      "Keep my rules",
    );
    assert.throws(
      () => initialize(f.root, "both"),
      /Preserving existing user file/,
    );
  } finally {
    f.cleanup();
  }
});
