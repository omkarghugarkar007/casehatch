import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fixture } from "./helpers.js";
import {
  installHook,
  uninstallHook,
  verifyPush,
  verifyCommittedFiles,
} from "../dist/hooks/index.js";
import { applyPlan } from "../src/plans/index.js";
function repo(f: ReturnType<typeof fixture>) {
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", f.root, ...args], { encoding: "utf8" }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Synthetic Test");
  git("config", "user.email", "synthetic@example.test");
  f.write(".gitignore", "node_modules/\ntest-results/\nplaywright-report/\n");
  applyPlan(f.root, f.plan);
  git("add", ".");
  git("commit", "-qm", "synthetic fixture");
  return git;
}
test("hook composes existing executable hook, forwards stdin, verifies HEAD and restores exact bytes", () => {
  const f = fixture();
  try {
    const git = repo(f);
    const old = "#!/bin/sh\ncat > .git/received-refs\nexit 0\n";
    f.write(".git/hooks/pre-push", old);
    chmodSync(resolve(f.root, ".git/hooks/pre-push"), 0o755);
    installHook(f.root, "feature");
    installHook(f.root, "feature");
    const refs = `refs/heads/main ${git("rev-parse", "HEAD")} refs/heads/main ${"0".repeat(40)}\n`;
    const result = spawnSync(
      resolve(f.root, ".git/hooks/pre-push"),
      ["origin", "example.test"],
      { cwd: f.root, input: refs, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(
      readFileSync(resolve(f.root, ".git/received-refs"), "utf8"),
      refs,
    );
    uninstallHook(f.root);
    uninstallHook(f.root);
    assert.equal(
      readFileSync(resolve(f.root, ".git/hooks/pre-push"), "utf8"),
      old,
    );
    assert.throws(() => verifyPush(f.root, refs + refs), /exactly one/);
    assert.throws(
      () => verifyPush(f.root, refs.replace("refs/heads/main", "refs/tags/v1")),
      /Only the current/,
    );
    f.write("app.ts", "dirty");
    assert.throws(() => verifyPush(f.root, refs), /uncommitted/);
  } finally {
    f.cleanup();
  }
});
test("existing hook failure remains a failure; edited wrappers are preserved", () => {
  const f = fixture();
  try {
    repo(f);
    const old = "#!/bin/sh\nexit 17\n";
    f.write(".git/hooks/pre-push", old);
    chmodSync(resolve(f.root, ".git/hooks/pre-push"), 0o755);
    installHook(f.root, "feature");
    const path = resolve(f.root, ".git/hooks/pre-push");
    const wrapper = readFileSync(path, "utf8");
    const result = spawnSync(path, [], {
      cwd: f.root,
      input: "",
      encoding: "utf8",
    });
    assert.equal(result.status, 17);
    f.write(".git/hooks/pre-push", wrapper + "\n# user edit");
    assert.throws(() => uninstallHook(f.root), /edited/);
    assert.ok(existsSync(path));
    assert.ok(existsSync(path + ".casehatch-original"));
  } finally {
    f.cleanup();
  }
});

test("ignored runtime inputs block pushed-revision certification and existing hook managers are untouched", () => {
  const f = fixture();
  try {
    const git = repo(f);
    f.write(".git/info/exclude", "local-runtime.ts\n");
    f.write("local-runtime.ts", "export const flag=true;");
    const refs = `refs/heads/main ${git("rev-parse", "HEAD")} refs/heads/main ${"0".repeat(40)}\n`;
    verifyPush(f.root, refs);
    assert.throws(
      () => verifyCommittedFiles(f.root, ["local-runtime.ts"]),
      /absent from pushed HEAD/,
    );
    verifyCommittedFiles(f.root, [
      "requirements.md",
      ".casehatch/context/feature/SRC-REQ.txt",
    ]);
    f.write(".husky/pre-push", "#!/bin/sh\necho keep me\n");
    git("config", "core.hooksPath", ".husky");
    assert.throws(() => installHook(f.root, "feature"), /hook manager/);
    assert.equal(
      readFileSync(resolve(f.root, ".husky/pre-push"), "utf8"),
      "#!/bin/sh\necho keep me\n",
    );
  } finally {
    f.cleanup();
  }
});

test("nonexecutable existing hooks stay inactive and their bytes/mode are restored", () => {
  const f = fixture();
  try {
    const git = repo(f);
    const old = "#!/bin/sh\nexit 17\n";
    f.write(".git/hooks/pre-push", old);
    chmodSync(resolve(f.root, ".git/hooks/pre-push"), 0o644);
    installHook(f.root, "feature");
    const refs = `refs/heads/main ${git("rev-parse", "HEAD")} refs/heads/main ${"0".repeat(40)}\n`;
    const r = spawnSync(resolve(f.root, ".git/hooks/pre-push"), [], {
      cwd: f.root,
      input: refs,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    uninstallHook(f.root);
    assert.equal(
      readFileSync(resolve(f.root, ".git/hooks/pre-push"), "utf8"),
      old,
    );
  } finally {
    f.cleanup();
  }
});
