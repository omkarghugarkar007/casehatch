import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  atomicJson,
  atomicWrite,
  HatchError,
  inside,
  readJson,
  sha256,
} from "./store.js";
import { configSchema } from "./contracts.js";
export type Agent = "none" | "codex" | "claude" | "both";
interface Installation {
  schemaVersion: 1;
  files: Record<string, string>;
}
export function initialize(
  root: string,
  agent: Agent,
  feature?: string,
  runnerConfig?: string,
) {
  const configPath = inside(root, "casehatch.config.json");
  const created: string[] = [];
  const preserved: string[] = [];
  if (!existsSync(configPath)) {
    const detected =
      runnerConfig ??
      [
        "playwright.config.ts",
        "playwright.config.mts",
        "playwright.config.js",
        "playwright.config.mjs",
        "playwright.config.cjs",
      ].find((p) => existsSync(inside(root, p))) ??
      "playwright.config.ts";
    atomicJson(
      configPath,
      configSchema.parse({
        schemaVersion: 1,
        activeFeature: feature,
        runner: { adapter: "playwright", config: detected },
      }),
    );
    created.push("casehatch.config.json");
  } else {
    configSchema.parse(readJson(configPath));
    preserved.push("casehatch.config.json");
  }
  const manifestPath = inside(root, ".casehatch/installation.json");
  const ownership: Installation = existsSync(manifestPath)
    ? (readJson(manifestPath) as Installation)
    : { schemaVersion: 1, files: {} };
  const template = fileURLToPath(
    new URL("../integrations/casehatch/", import.meta.url),
  );
  function writeOwned(path: string, content: string) {
    const full = inside(root, path);
    if (existsSync(full)) {
      const current = sha256(readFileSync(full));
      if (current === sha256(content)) {
        preserved.push(path);
        return;
      }
      if (ownership.files[path] !== current)
        throw new HatchError(
          "FILE_CONFLICT",
          `Preserving existing user file: ${path}. Choose another skill name or merge manually.`,
        );
    }
    atomicWrite(full, content);
    ownership.files[path] = sha256(content);
    created.push(path);
    atomicJson(manifestPath, ownership);
  }
  const ignore = inside(root, ".casehatch/.gitignore");
  const existing = existsSync(ignore) ? readFileSync(ignore, "utf8") : "";
  const rules = ["/context/", "/runs/", "/locks/"];
  const missing = rules.filter((r) => !existing.split(/\r?\n/).includes(r));
  if (missing.length)
    atomicWrite(
      ignore,
      existing +
        (existing && !existing.endsWith("\n") ? "\n" : "") +
        "# CaseHatch private local state\n" +
        missing.join("\n") +
        "\n",
    );
  for (const provider of agent === "both"
    ? ["codex", "claude"]
    : agent === "none"
      ? []
      : [agent]) {
    const dir =
      provider === "codex"
        ? ".agents/skills/casehatch"
        : ".claude/skills/casehatch";
    writeOwned(
      `${dir}/SKILL.md`,
      readFileSync(resolve(template, "SKILL.md"), "utf8"),
    );
    for (const reference of ["plan.md", "mcp.md"])
      writeOwned(
        `${dir}/references/${reference}`,
        readFileSync(resolve(template, "references", reference), "utf8"),
      );
  }
  atomicJson(manifestPath, ownership);
  return {
    schemaVersion: 1,
    created,
    preserved,
    message:
      "Initialized. Import product context, then use your existing agent to save a source-grounded plan.",
  };
}
export function uninstallIntegrations(root: string) {
  const path = inside(root, ".casehatch/installation.json");
  if (!existsSync(path)) return { removed: [], preserved: [] };
  const ownership = readJson(path) as Installation;
  const removed: string[] = [];
  const preserved: string[] = [];
  for (const [path, hash] of Object.entries(ownership.files)) {
    const full = inside(root, path);
    if (!existsSync(full)) {
      delete ownership.files[path];
      continue;
    }
    if (sha256(readFileSync(full)) !== hash) {
      preserved.push(path);
      continue;
    }
    unlinkSync(full);
    removed.push(path);
    delete ownership.files[path];
  }
  atomicJson(path, ownership);
  return { removed, preserved };
}
