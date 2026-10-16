import { VERSION } from "../../version.js";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import type { Config, Snapshot } from "../../contracts.js";
import { digest, inside, sha256, HatchError } from "../../store.js";
export function playwright(root: string): { cli: string; version: string } {
  const require = createRequire(resolve(root, "package.json"));
  try {
    const packagePath = require.resolve("@playwright/test/package.json");
    const version = JSON.parse(readFileSync(packagePath, "utf8"))
      .version as string;
    if (!/^1\.(63|64)\.\d+$/.test(version))
      throw new HatchError(
        "RUNNER_VERSION",
        `Supported Playwright: 1.63.x or 1.64.x; installed: ${version}.`,
      );
    return { cli: require.resolve("@playwright/test/cli"), version };
  } catch (e) {
    if (e instanceof HatchError) throw e;
    throw new HatchError(
      "RUNNER_MISSING",
      "Install the supported local runner: npm install -D @playwright/test@1.64.1",
    );
  }
}
function git(root: string, args: string[]): string | null {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
export function snapshot(root: string, config: Config): Snapshot {
  const files: Record<string, string> = {};
  let count = 0;
  let bytes = 0;
  function walk(path: string) {
    for (const e of readdirSync(path, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = resolve(path, e.name);
      const rel = relative(root, full).split("\\").join("/");
      if (
        ["node_modules", ".git", ".DS_Store"].includes(e.name) ||
        [".casehatch/runs", ".casehatch/locks"].some(
          (p) => rel === p || rel.startsWith(p + "/"),
        ) ||
        config.generatedDirectories.some(
          (p) => rel === p || rel.startsWith(p + "/"),
        )
      )
        continue;
      if (e.isSymbolicLink())
        throw new HatchError(
          "SYMLINK_UNSUPPORTED",
          `Source symlinks are unsupported in this alpha: ${rel}.`,
        );
      if (e.isDirectory()) {
        walk(full);
        continue;
      }
      if (!e.isFile())
        throw new HatchError(
          "FILE_UNSUPPORTED",
          `Unsupported filesystem entry: ${rel}`,
        );
      count++;
      bytes += lstatSync(full).size;
      if (count > 20000 || bytes > 256 * 1024 * 1024)
        throw new HatchError(
          "PROJECT_TOO_LARGE",
          "Alpha snapshot limit: 20,000 files / 256 MiB. Use a focused project directory.",
        );
      files[rel] = sha256(readFileSync(full));
    }
  }
  walk(root);
  // Never permit a generated-directory exclusion to hide runner or metadata inputs.
  const required = ["casehatch.config.json", config.runner.config];
  for (const p of required) files[p] = sha256(readFileSync(inside(root, p)));
  const environmentHash = digest(
    Object.fromEntries(
      [...config.environmentKeys]
        .sort()
        .map((k) => [k, process.env[k] ?? null]),
    ),
  );
  const info = {
    node: process.version,
    casehatch: VERSION,
    platform: `${process.platform}-${process.arch}`,
    playwright: playwright(root).version,
    environmentHash,
  };
  const status = git(root, ["status", "--porcelain", "--untracked-files=all"]);
  return {
    ...info,
    files,
    digest: digest({ files, ...info }),
    head: git(root, ["rev-parse", "HEAD"]),
    dirty: status === null ? null : status.length > 0,
  };
}
