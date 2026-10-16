import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../examples/demo", import.meta.url));
const cli = fileURLToPath(new URL("../dist/cli/index.js", import.meta.url));
const env = { ...process.env };
if (process.argv.includes("--bug")) env.CASEHATCH_DEMO_BUG = "1";
else delete env.CASEHATCH_DEMO_BUG;
function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, "--cwd", root, ...args], {
    env,
    stdio: "inherit",
  });
  if (result.status !== expected) process.exit(result.status || 3);
}
run(["init", "--feature", "csv-import"]);
for (const [id, kind, file] of [
  ["SRC-BRD", "brd", "BRD"],
  ["SRC-PRD", "prd", "PRD"],
  ["SRC-TICKET", "ticket", "TICKET"],
  ["SRC-DECISIONS", "decision", "DECISIONS"],
])
  run([
    "context",
    "add",
    "--id",
    id,
    "--kind",
    kind,
    "--file",
    `context/${file}.md`,
  ]);
run(["plan", "apply", "plan.json"]);
run(["check", "--budget", "60s"], process.argv.includes("--bug") ? 1 : 0);
console.log(
  process.argv.includes("--bug")
    ? "\nIntentional retry defect reproduced (exit 1). Required scope was unchanged."
    : "\nDemo passed. Try npm run demo:bug to reproduce the intentional retry defect.",
);
