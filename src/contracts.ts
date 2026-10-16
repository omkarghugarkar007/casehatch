import { z } from "zod";

export const id = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/);
export const text = z.string().trim().min(1).max(12000);
export const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const relativePath = z
  .string()
  .min(1)
  .regex(
    /^(?!\/)(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\/$)[^\u0000]+$/,
    "Use a canonical repository-relative POSIX path without . or .. segments",
  );
export const configSchema = z.strictObject({
  schemaVersion: z.literal(1),
  activeFeature: id.optional(),
  runner: z.strictObject({
    adapter: z.literal("playwright"),
    config: relativePath,
  }),
  budgetSeconds: z.number().positive().max(86400).default(60),
  generatedDirectories: z
    .array(
      relativePath.refine(
        (p) => p !== ".casehatch" && !p.startsWith(".casehatch/"),
        "CaseHatch metadata cannot be excluded from freshness",
      ),
    )
    .default(["test-results", "playwright-report"]),
  environmentKeys: z
    .array(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/))
    .default(["CI", "NODE_ENV"]),
});
export type Config = z.infer<typeof configSchema>;
export const retrievalSchema = z.strictObject({
  method: z.literal("mcp"),
  server: text,
  tools: z.array(text).min(1),
  resourceType: z.enum(["jira-issue", "confluence-page", "other"]),
  resourceId: text,
  version: text.nullable(),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
  fetchedAt: z.iso.datetime({ offset: true }),
});
export const sourceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  featureId: id,
  kind: z.enum(["prd", "brd", "ticket", "decision", "invariant", "other"]),
  path: relativePath,
  origin: text,
  sha256: hash,
  capturedAt: z.iso.datetime(),
  extraction: z.enum(["complete", "excerpt", "summary", "unreadable"]),
  limitations: z.array(text),
  retrieval: retrievalSchema.optional(),
});
export type Source = z.infer<typeof sourceSchema>;
const provenance = z.array(text).min(1);
export const planSchema = z.strictObject({
  schemaVersion: z.literal(1),
  featureId: id,
  title: text,
  scopeRevision: z.number().int().positive(),
  changeReason: text.optional(),
  scopeChange: z.strictObject({ reason: text, provenance }).optional(),
  brief: z.strictObject({
    goal: text,
    actors: z.array(text),
    rules: z.array(text),
    exclusions: z.array(text),
  }),
  sources: z.array(z.strictObject({ id, sha256: hash })),
  decisions: z.array(
    z.strictObject({ id, question: text, answer: text.optional(), provenance }),
  ),
  obligations: z.array(
    z.strictObject({
      id,
      title: text,
      scope: z.enum(["required", "candidate", "deferred", "excluded"]),
      provenance,
      requiredCaseIds: z.array(id),
      reason: text.optional(),
    }),
  ),
  cases: z.array(
    z.strictObject({
      id,
      title: text,
      expectedOutcome: text,
      provenance,
      binding: z.strictObject({
        file: relativePath,
        projects: z.array(z.string().max(100)).min(1),
      }),
      assertions: z.array(z.strictObject({ id, description: text })).min(1),
    }),
  ),
  unresolved: z.array(text),
  conflicts: z.array(text),
  deferredConcerns: z.array(
    z.strictObject({
      id,
      title: text,
      reason: text,
      acknowledged: z.boolean(),
    }),
  ),
});
export type Plan = z.infer<typeof planSchema>;
export interface FrozenPlan {
  schemaVersion: 1;
  plan: Plan;
  digest: string;
  appliedAt: string;
  previousDigest: string | null;
  scopeDelta: string[];
}
export const caseStates = [
  "passed",
  "product_failed",
  "blocked",
  "skipped",
  "stale",
  "missing",
  "interrupted",
  "unexecuted",
  "flaky",
  "unknown_failure",
] as const;
export type CaseState = (typeof caseStates)[number];
export interface AssertionEvidence {
  id: string;
  expects: number;
  failed: boolean;
  completed: boolean;
}
export interface Attempt {
  status: string;
  expectedStatus: string;
  retry: number;
  durationMs: number;
  assertions: AssertionEvidence[];
  errors: string[];
  attachments: { name: string; path?: string }[];
  failedExpect: boolean;
  outsideError: boolean;
  setupFailed: boolean;
}
export interface Binding {
  testId: string;
  caseIds: string[];
  file: string;
  project: string;
  title: string;
}
export interface RunnerEvidence {
  schemaVersion: 1;
  origin: "playwright-reporter";
  runId: string;
  token: string;
  bindings: Binding[];
  attempts: Record<string, Attempt[]>;
  errors: string[];
  ended: boolean;
  runnerStatus?: string;
  version?: string;
}
export interface Snapshot {
  digest: string;
  files: Record<string, string>;
  head: string | null;
  dirty: boolean | null;
  node: string;
  casehatch: string;
  platform: string;
  playwright: string;
  environmentHash: string;
}
export interface CaseResult {
  caseId: string;
  project: string;
  status: CaseState;
  reason: string;
  expectedOutcome: string;
  binding?: Binding;
  attempts: Attempt[];
}
export interface Coverage {
  required: number;
  planned: number;
  executed: number;
  passed: number;
  planningPercent: number | null;
  executionPercent: number | null;
  passingPercent: number | null;
}
export interface Report {
  schemaVersion: 1;
  origin: "casehatch-check";
  runId: string;
  featureId: string;
  scopeRevision: number;
  planDigest: string;
  startedAt: string;
  elapsedMs: number;
  verdict: "READY" | "FAIL" | "INCOMPLETE" | "NO_SCOPE" | "ERROR";
  exitCode: 0 | 1 | 2 | 3;
  coverage: Coverage;
  caseResults: CaseResult[];
  problems: string[];
  scopeDelta: string[];
  budgetExpired: boolean;
  snapshot: Snapshot;
  artifacts: string;
  deferredConcerns: Plan["deferredConcerns"];
  obligations: Plan["obligations"];
  sources: Plan["sources"];
  sourceRecords: Source[];
}
