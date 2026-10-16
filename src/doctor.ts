import { existsSync } from "node:fs";
import { loadConfig, inside } from "./store.js";
import { playwright } from "./runners/playwright/environment.js";
import { sources, sourceProblems } from "./context/index.js";
export function doctor(root: string) {
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  checks.push({
    name: "node",
    ok:
      Number(process.versions.node.split(".")[0]) > 22 ||
      (Number(process.versions.node.split(".")[0]) === 22 &&
        Number(process.versions.node.split(".")[1]) >= 12),
    detail: process.version,
  });
  try {
    const config = loadConfig(root);
    checks.push({ name: "config", ok: true, detail: "casehatch.config.json" });
    checks.push({
      name: "playwright config",
      ok: existsSync(inside(root, config.runner.config)),
      detail: config.runner.config,
    });
    try {
      const runner = playwright(root);
      checks.push({ name: "playwright", ok: true, detail: runner.version });
    } catch (e) {
      checks.push({
        name: "playwright",
        ok: false,
        detail: (e as Error).message,
      });
    }
    if (config.activeFeature) {
      const registered = sources(root, config.activeFeature);
      const problems = sourceProblems(root, config.activeFeature);
      checks.push({
        name: "context",
        ok: registered.length > 0 && !problems.length,
        detail:
          problems.join("; ") || `${registered.length} registered source(s)`,
      });
      checks.push({
        name: "plan",
        ok: existsSync(
          inside(root, `.casehatch/features/${config.activeFeature}/plan.json`),
        ),
        detail: config.activeFeature,
      });
    }
  } catch (e) {
    checks.push({ name: "config", ok: false, detail: (e as Error).message });
  }
  return { schemaVersion: 1, ok: checks.every((c) => c.ok), checks };
}
