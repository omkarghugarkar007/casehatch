import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  renameSync,
  chmodSync,
  unlinkSync,
  lstatSync,
  realpathSync,
} from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  atomicJson,
  atomicWrite,
  HatchError,
  readJson,
  sha256,
} from "../store.js";
function git(root: string, args: string[]) {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new HatchError(
      "GIT_REQUIRED",
      "Use this command in a single Git project with a committed HEAD.",
    );
  }
}
const quote = (s: string) => "'" + s.replace(/'/g, "'\\''") + "'";
interface HookInstall {
  schemaVersion: 1;
  path: string;
  backup: string | null;
  hash: string;
}
function locations(root: string) {
  const top = git(root, ["rev-parse", "--show-toplevel"]);
  if (realpathSync(top) !== realpathSync(root))
    throw new HatchError(
      "HOOK_SCOPE",
      "Alpha hooks require the project at the Git repository root.",
    );
  let managedPath = "";
  try {
    managedPath = execFileSync(
      "git",
      ["-C", root, "config", "--get", "core.hooksPath"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {}
  if (managedPath)
    throw new HatchError(
      "HOOK_MANAGER",
      "core.hooksPath is already configured. Preserve your hook manager and add casehatch hook --feature ID to its pre-push script (forward Git stdin).",
    );
  const path = resolve(
    root,
    git(root, ["rev-parse", "--git-path", "hooks/pre-push"]),
  );
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel))
    throw new HatchError(
      "HOOK_PATH",
      "External core.hooksPath is unsupported; integrate casehatch check manually in your hook manager.",
    );
  return {
    path,
    manifest: resolve(
      root,
      git(root, ["rev-parse", "--git-path", "casehatch-hook.json"]),
    ),
  };
}
export function installHook(root: string, feature: string) {
  if (process.platform === "win32")
    throw new HatchError(
      "HOOK_PLATFORM",
      "Alpha hook installer supports macOS/Linux POSIX hooks.",
    );
  const { path, manifest } = locations(root);
  if (existsSync(manifest)) {
    const saved = readJson(manifest) as HookInstall;
    if (
      saved.path === path &&
      existsSync(path) &&
      sha256(readFileSync(path)) === saved.hash
    )
      return { message: "Pre-push hook already installed.", path };
    throw new HatchError(
      "HOOK_EDITED",
      "Hook configuration changed after installation; preserve edits and uninstall/merge manually.",
    );
  }
  if (
    existsSync(path) &&
    (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())
  )
    throw new HatchError(
      "HOOK_TYPE",
      "Existing symlink or non-file hook must be integrated manually.",
    );
  const backup = existsSync(path) ? path + ".casehatch-original" : null;
  if (backup && existsSync(backup))
    throw new HatchError(
      "HOOK_BACKUP",
      "A hook backup already exists; preserving both files.",
    );
  const cli = fileURLToPath(new URL("../cli/index.js", import.meta.url));
  const script = `#!/bin/sh
# CaseHatch owned wrapper; uninstall with: casehatch hooks uninstall
casehatch_input=$(mktemp) || exit 2
trap 'rm -f "$casehatch_input"' EXIT HUP INT TERM
cat > "$casehatch_input"
${backup ? `if [ -x ${quote(backup)} ]; then\n  ${quote(backup)} "$@" < "$casehatch_input" || exit $?\nfi\n` : ""}${quote(process.execPath)} ${quote(cli)} hook --feature ${quote(feature)} < "$casehatch_input"
`;
  if (backup) renameSync(path, backup);
  try {
    atomicWrite(path, script);
    chmodSync(path, 0o755);
    atomicJson(manifest, {
      schemaVersion: 1,
      path,
      backup,
      hash: sha256(script),
    } satisfies HookInstall);
  } catch (e) {
    if (existsSync(path)) unlinkSync(path);
    if (backup) renameSync(backup, path);
    throw e;
  }
  return {
    message:
      "Installed pre-push wrapper; existing hook runs first with the original stdin.",
    path,
  };
}
export function uninstallHook(root: string) {
  const { manifest } = locations(root);
  if (!existsSync(manifest)) return { message: "No CaseHatch hook installed." };
  const saved = readJson(manifest) as HookInstall;
  if (
    !existsSync(saved.path) ||
    sha256(readFileSync(saved.path)) !== saved.hash
  )
    throw new HatchError(
      "HOOK_EDITED",
      "Pre-push hook was edited; refusing to delete user changes. Restore the wrapper or merge/remove it manually.",
    );
  if (saved.backup && !existsSync(saved.backup))
    throw new HatchError(
      "HOOK_BACKUP_MISSING",
      "Original hook backup is missing; preserving wrapper.",
    );
  unlinkSync(saved.path);
  if (saved.backup) renameSync(saved.backup, saved.path);
  unlinkSync(manifest);
  return {
    message: "Removed CaseHatch wrapper and restored the original hook.",
  };
}
export function verifyPush(root: string, input: string) {
  if (
    realpathSync(git(root, ["rev-parse", "--show-toplevel"])) !==
    realpathSync(root)
  )
    throw new HatchError(
      "PUSH_SCOPE",
      "Alpha hook verification requires the project at the Git root.",
      2,
    );
  const lines = input.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1)
    throw new HatchError(
      "PUSH_SCOPE",
      "Alpha verifies exactly one HEAD branch push; multiple refs or empty push input are unsupported.",
      2,
    );
  const [ref, sha] = lines[0]!.trim().split(/\s+/);
  if (
    !ref?.startsWith("refs/heads/") ||
    !sha ||
    /^0+$/.test(sha) ||
    sha !== git(root, ["rev-parse", "HEAD"]) ||
    ref !== git(root, ["symbolic-ref", "HEAD"])
  )
    throw new HatchError(
      "PUSH_REVISION",
      "Only the current HEAD branch can be verified. Tags, deletions and non-HEAD refs are unsupported.",
      2,
    );
  verifyClean(root);
  return sha;
}
export function verifyClean(root: string) {
  if (git(root, ["status", "--porcelain", "--untracked-files=all"]))
    throw new HatchError(
      "DIRTY_PUSH",
      "Commit or remove uncommitted/untracked changes before using the hook. CaseHatch will not stash or commit your work.",
      2,
    );
}

export function verifyCommittedFiles(root: string, files: string[]) {
  const committed = new Set(
    execFileSync(
      "git",
      ["-C", root, "ls-tree", "-r", "--name-only", "-z", "HEAD"],
      { encoding: "utf8" },
    ).split("\0"),
  );
  const missing = files.filter(
    (file) => !file.startsWith(".casehatch/context/") && !committed.has(file),
  );
  if (missing.length)
    throw new HatchError(
      "UNCOMMITTED_INPUT",
      "Ignored/local input is absent from pushed HEAD: " +
        missing.slice(0, 8).join(", ") +
        ". Alpha hooks require source/config/test files in the commit; use explicit environment keys instead of ignored runtime files.",
      2,
    );
}
