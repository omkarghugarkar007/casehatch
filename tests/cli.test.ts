import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { configSchema } from "../src/contracts.js";
import { loadConfig } from "../src/store.js";
import { fixture, repository } from "./helpers.js";

test("CLI emits one stable JSON error for invalid input and reports blocked setup without writes", () => {
  const f = fixture();
  try {
    assert.throws(
      () =>
        configSchema.parse({
          ...loadConfig(f.root),
          generatedDirectories: [".casehatch/features"],
        }),
      /metadata cannot be excluded/,
    );
    const cli = resolve(repository, "dist/cli/index.js");
    const run = (args: string[]) =>
      spawnSync(
        process.execPath,
        [cli, "--cwd", f.root, "--format", "json", ...args],
        { encoding: "utf8" },
      );
    const bad = run(["check", "--budget", "bananas"]);
    assert.equal(bad.status, 3);
    assert.equal(JSON.parse(bad.stdout).error.code, "BUDGET");
    const missing = run(["check"]);
    assert.equal(missing.status, 2);
    assert.equal(JSON.parse(missing.stdout).error.code, "PLAN_MISSING");
    const doctor = run(["doctor"]);
    assert.equal(doctor.status, 2);
    assert.equal(JSON.parse(doctor.stdout).ok, false);
    const unknown = run(["unknown"]);
    assert.equal(unknown.status, 3);
    assert.equal(JSON.parse(unknown.stdout).error.code, "USAGE");
  } finally {
    f.cleanup();
  }
});
