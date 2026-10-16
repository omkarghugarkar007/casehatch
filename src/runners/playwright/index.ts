import { spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config, Plan, RunnerEvidence } from "../../contracts.js";
import { HatchError, regularFile } from "../../store.js";
import { playwright } from "./environment.js";

export function parseEvents(
  path: string,
  runId: string,
  token: string,
): RunnerEvidence {
  const evidence: RunnerEvidence = {
    schemaVersion: 1,
    origin: "playwright-reporter",
    runId,
    token,
    bindings: [],
    attempts: {},
    errors: [],
    ended: false,
  };
  if (!existsSync(path)) {
    evidence.errors.push(
      "No reporter evidence received. Check runner.log for configuration/setup errors.",
    );
    return evidence;
  }
  let began = false;
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    let event;
    try {
      event = JSON.parse(lines[i]!);
    } catch {
      evidence.errors.push("Truncated or invalid reporter event.");
      continue;
    }
    if (event.runId !== runId || event.token !== token)
      throw new HatchError(
        "EVIDENCE_ORIGIN",
        "Reporter event does not belong to this invocation.",
      );
    switch (event.type) {
      case "begin":
        if (began)
          throw new HatchError(
            "EVIDENCE_DUPLICATE",
            "Multiple reporter suites received.",
          );
        began = true;
        evidence.bindings = event.data.bindings;
        evidence.version = event.data.version;
        break;
      case "attempt":
        (evidence.attempts[event.data.testId] ??= []).push(event.data.attempt);
        break;
      case "error":
        evidence.errors.push(event.data);
        break;
      case "end":
        evidence.ended = true;
        evidence.runnerStatus = event.data.status;
        break;
      default:
        throw new HatchError("EVIDENCE_FORMAT", "Unknown reporter event.");
    }
  }
  return evidence;
}
function wrapper(configPath: string, reporterPath: string): string {
  return `import original from ${JSON.stringify(configPath)};
const reporters = typeof original.reporter === 'string' ? [[original.reporter]] : original.reporter ?? [[process.env.CI ? 'dot' : 'list']];
export default {...original, reporter: [...reporters, [${JSON.stringify(reporterPath)}]]};\n`;
}
export async function runPlaywright(
  root: string,
  config: Config,
  p: Plan,
  runDir: string,
  runId: string,
  token: string,
  budgetMs: number,
) {
  const runner = playwright(root);
  const configPath = regularFile(root, config.runner.config);
  const requiredIds = new Set(
    p.obligations
      .filter((o) => o.scope === "required")
      .flatMap((o) => o.requiredCaseIds),
  );
  const cases = p.cases.filter((c) => requiredIds.has(c.id));
  const tags = cases
    .map((c) => "@casehatch:" + c.id)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = `(?:^|\\s)(?:${tags.join("|")})(?=\\s|$)`;
  const wrapperPath = resolve(
    dirname(configPath),
    `.casehatch-${runId}.config.ts`,
  );
  mkdirSync(runDir, { recursive: true });
  const composed = wrapper(
    configPath,
    fileURLToPath(new URL("./reporter.js", import.meta.url)),
  );
  writeFileSync(resolve(runDir, "playwright.config.ts"), composed);
  writeFileSync(wrapperPath, composed, { flag: "wx" });
  const events = resolve(runDir, "events.jsonl");
  const args = [
    runner.cli,
    "test",
    "--config",
    wrapperPath,
    "--grep",
    pattern,
    "--forbid-only",
  ];
  const projects = [...new Set(cases.flatMap((c) => c.binding.projects))];
  for (const project of projects) args.push("--project", project);
  let expired = false;
  let interrupted = false;
  let log = "";
  let logBytes = 0;
  let forceTimer: ReturnType<typeof setTimeout> | undefined;
  let exit: number | null;
  try {
    exit = await new Promise<number | null>((done, reject) => {
      const child = spawn(process.execPath, args, {
        cwd: root,
        env: {
          ...process.env,
          CASEHATCH_ROOT: root,
          CASEHATCH_EVENTS: events,
          CASEHATCH_RUN_ID: runId,
          CASEHATCH_TOKEN: token,
        },
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });
      function signal(sig: NodeJS.Signals) {
        try {
          if (child.pid)
            process.kill(
              process.platform === "win32" ? child.pid : -child.pid,
              sig,
            );
        } catch {
          /* already stopped */
        }
      }
      function stop() {
        signal("SIGTERM");
        forceTimer ??= setTimeout(() => signal("SIGKILL"), 3000);
      }
      const timer = setTimeout(
        () => {
          expired = true;
          stop();
        },
        Math.max(1, budgetMs),
      );
      const cancel = () => {
        interrupted = true;
        stop();
      };
      process.on("SIGINT", cancel);
      process.on("SIGTERM", cancel);
      const output = (chunk: Buffer) => {
        if (logBytes < 4_000_000) {
          log += chunk.toString();
          logBytes += chunk.length;
        }
      };
      child.stdout.on("data", output);
      child.stderr.on("data", output);
      function clean() {
        clearTimeout(timer);
        if (forceTimer) clearTimeout(forceTimer);
        process.off("SIGINT", cancel);
        process.off("SIGTERM", cancel);
      }
      child.on("error", (e) => {
        clean();
        reject(new HatchError("RUNNER_SPAWN", e.message));
      });
      child.on("close", (code) => {
        clean();
        done(code);
      });
    });
  } finally {
    unlinkSync(wrapperPath);
  }
  writeFileSync(resolve(runDir, "runner.log"), log);
  return {
    evidence: parseEvents(events, runId, token),
    budgetExpired: expired,
    interrupted,
    processExit: exit,
  };
}
