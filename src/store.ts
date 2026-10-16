import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
  lstatSync,
  unlinkSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { configSchema, type Config, id } from "./contracts.js";

export class HatchError extends Error {
  constructor(
    public code: string,
    message: string,
    public exitCode: 2 | 3 = 3,
  ) {
    super(message);
  }
}
export const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export const digest = (value: unknown) => sha256(canonical(value));
export function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new HatchError(
      "INVALID_JSON",
      `Cannot read ${path}: ${(e as Error).message}`,
    );
  }
}
export function atomicJson(path: string, value: unknown): void {
  atomicWrite(path, JSON.stringify(value, null, 2) + "\n");
}
export function atomicWrite(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = path + "." + randomUUID() + ".tmp";
  try {
    writeFileSync(temp, value, { mode: 0o600, flag: "wx" });
    renameSync(temp, path);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}
export function inside(root: string, path: string): string {
  const full = resolve(root, path);
  const rel = relative(resolve(root), full);
  if (isAbsolute(rel) || rel === ".." || rel.startsWith(".." + sep))
    throw new HatchError("UNSAFE_PATH", `Path is outside project: ${path}`);
  let current = full;
  while (!existsSync(current) && dirname(current) !== current)
    current = dirname(current);
  const real = realpathSync(current);
  const realRel = relative(realpathSync(root), real);
  if (realRel === ".." || realRel.startsWith(".." + sep) || isAbsolute(realRel))
    throw new HatchError("UNSAFE_PATH", `Symlink leaves project: ${path}`);
  return full;
}
export function featureDir(root: string, feature: string): string {
  id.parse(feature);
  return inside(root, `.casehatch/features/${feature}`);
}
export function loadConfig(root: string): Config {
  const path = inside(root, "casehatch.config.json");
  if (!existsSync(path))
    throw new HatchError(
      "NOT_INITIALIZED",
      "Run casehatch init in your project first.",
    );
  return configSchema.parse(readJson(path));
}
export function featureId(config: Config, requested?: string): string {
  const result = requested ?? config.activeFeature;
  if (!result)
    throw new HatchError(
      "FEATURE_REQUIRED",
      "Specify --feature ID or set activeFeature in casehatch.config.json.",
    );
  return id.parse(result);
}
export function withLock<T>(root: string, action: () => T): T {
  const path = inside(root, ".casehatch/locks/write.lock");
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, String(process.pid), { flag: "wx" });
  } catch {
    throw new HatchError(
      "BUSY",
      "Another CaseHatch operation owns .casehatch/locks/write.lock. If no operation is running, remove that lock.",
    );
  }
  try {
    return action();
  } finally {
    unlinkSync(path);
  }
}
export async function withAsyncLock<T>(
  root: string,
  action: () => Promise<T>,
): Promise<T> {
  const path = inside(root, ".casehatch/locks/write.lock");
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, String(process.pid), { flag: "wx" });
  } catch {
    throw new HatchError(
      "BUSY",
      "Another operation owns .casehatch/locks/write.lock. Remove only if no operation is running.",
    );
  }
  try {
    return await action();
  } finally {
    unlinkSync(path);
  }
}
export function regularFile(root: string, path: string): string {
  const full = inside(root, path);
  if (!existsSync(full) || !lstatSync(full).isFile())
    throw new HatchError(
      "FILE_MISSING",
      `Expected a regular project file: ${path}`,
    );
  return full;
}
