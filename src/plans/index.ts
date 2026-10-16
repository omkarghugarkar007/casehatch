import { existsSync, readdirSync } from "node:fs";
import { type FrozenPlan, type Plan, planSchema } from "../contracts.js";
import { sources, sourceProblems } from "../context/index.js";
import { atomicJson, digest, HatchError, inside, readJson } from "../store.js";

function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length)
    throw new HatchError("DUPLICATE_ID", `Duplicate ${label}.`);
}
export function validatePlan(input: unknown): Plan {
  const p = planSchema.parse(input);
  unique(
    p.sources.map((s) => s.id),
    "source ID",
  );
  unique(
    p.decisions.map((d) => d.id),
    "decision ID",
  );
  unique(
    p.obligations.map((o) => o.id),
    "obligation ID",
  );
  unique(
    p.cases.map((c) => c.id),
    "case ID",
  );
  unique(
    p.deferredConcerns.map((c) => c.id),
    "concern ID",
  );
  unique(
    [...p.sources.map((s) => s.id), ...p.decisions.map((d) => d.id)],
    "provenance ID",
  );
  if (p.decisions.length > 3)
    throw new HatchError(
      "QUESTION_LIMIT",
      "At most three distinct material decision questions per source revision. Reuse previous answers.",
    );
  const sourceIds = new Set(p.sources.map((s) => s.id));
  const decisions = new Map(p.decisions.map((d) => [d.id, d]));
  function validateRef(ref: string, seen = new Set<string>()): void {
    const [refId, locator] = ref.split("#");
    if (refId && sourceIds.has(refId) && locator?.trim()) return;
    const decision = decisions.get(ref);
    if (!decision || !decision.answer || seen.has(ref))
      throw new HatchError(
        "INVALID_PROVENANCE",
        `Unresolved or unknown provenance: ${ref}. Use SOURCE#locator or an answered decision ID.`,
      );
    for (const r of decision.provenance)
      validateRef(r, new Set([...seen, ref]));
  }
  for (const d of p.decisions)
    d.provenance.forEach((r) => validateRef(r, new Set([d.id])));
  for (const o of p.obligations) {
    o.provenance.forEach((r) => validateRef(r));
    unique(o.requiredCaseIds, `${o.id} case reference`);
    if (o.scope === "required" && !o.requiredCaseIds.length)
      throw new HatchError(
        "EMPTY_MAPPING",
        `${o.id} requires at least one concrete case.`,
      );
    if (o.scope !== "required" && !o.reason)
      throw new HatchError(
        "SCOPE_REASON",
        `${o.id}: ${o.scope} scope needs an explicit reason.`,
      );
    for (const c of o.requiredCaseIds)
      if (!p.cases.some((x) => x.id === c))
        throw new HatchError(
          "MISSING_CASE",
          `${o.id} refers to unknown case ${c}.`,
        );
  }
  for (const c of p.cases) {
    c.provenance.forEach((r) => validateRef(r));
    unique(c.binding.projects, `${c.id} project`);
    unique(
      c.assertions.map((a) => a.id),
      `${c.id} assertion ID`,
    );
  }
  p.scopeChange?.provenance.forEach((r) => validateRef(r));
  return p;
}
export function loadPlan(root: string, feature: string): FrozenPlan {
  const path = inside(root, `.casehatch/features/${feature}/plan.json`);
  if (!existsSync(path))
    throw new HatchError(
      "PLAN_MISSING",
      `No saved plan for ${feature}. Use your agent to create one, then casehatch plan apply PATH.`,
      2,
    );
  const frozen = readJson(path) as FrozenPlan;
  const p = validatePlan(frozen.plan);
  if (frozen.schemaVersion !== 1 || digest(p) !== frozen.digest)
    throw new HatchError(
      "PLAN_CHANGED",
      "Frozen plan was edited. Apply a new draft revision instead.",
    );
  return { ...frozen, plan: p };
}
export function planContextProblems(root: string, p: Plan): string[] {
  const registered = sources(root, p.featureId);
  const selected = p.sources
    .map((s) => registered.find((r) => r.id === s.id))
    .filter((s) => s !== undefined);
  return [
    ...p.sources.flatMap((s) => {
      const found = registered.find((r) => r.id === s.id);
      return !found
        ? [`${s.id}: not imported; use context add.`]
        : found.sha256 !== s.sha256
          ? [`${s.id}: plan source hash is stale; revise the plan.`]
          : [];
    }),
    ...sourceProblems(root, p.featureId, selected),
  ];
}
export function scopeDelta(before: Plan, after: Plan): string[] {
  const changes: string[] = [];
  for (const old of before.obligations.filter((o) => o.scope === "required")) {
    const now = after.obligations.find((o) => o.id === old.id);
    if (!now || now.scope !== "required")
      changes.push(`${old.id}: removed from required scope`);
    else if (digest(old) !== digest(now))
      changes.push(`${old.id}: required mapping or outcome changed`);
    for (const id of old.requiredCaseIds) {
      const c = before.cases.find((c) => c.id === id);
      const next = after.cases.find((c) => c.id === id);
      if (
        c &&
        (!next ||
          digest({
            outcome: c.expectedOutcome,
            assertions: c.assertions,
            projects: c.binding.projects,
            provenance: c.provenance,
          }) !==
            digest({
              outcome: next.expectedOutcome,
              assertions: next.assertions,
              projects: next.binding.projects,
              provenance: next.provenance,
            }))
      )
        changes.push(
          `${id}: accepted case outcome, assertion, provenance or variants changed`,
        );
    }
  }
  for (const o of after.obligations.filter((o) => o.scope === "required"))
    if (
      !before.obligations.some((b) => b.id === o.id && b.scope === "required")
    )
      changes.push(`${o.id}: added to required scope`);
  return [...new Set(changes)];
}
export function applyPlan(root: string, input: unknown): FrozenPlan {
  const p = validatePlan(input);
  const problems = planContextProblems(root, p);
  if (problems.length)
    throw new HatchError("CONTEXT_INCOMPLETE", problems.join("\n"), 2);
  const previous = existsSync(
    inside(root, `.casehatch/features/${p.featureId}/plan.json`),
  )
    ? loadPlan(root, p.featureId)
    : null;
  if (previous?.digest === digest(p)) return previous;
  if (p.scopeRevision !== (previous ? previous.plan.scopeRevision + 1 : 1))
    throw new HatchError(
      "REVISION",
      `Expected scopeRevision ${previous ? previous.plan.scopeRevision + 1 : 1}.`,
    );
  if (previous && !p.changeReason)
    throw new HatchError("CHANGE_REASON", "A new revision needs changeReason.");
  const delta = previous ? scopeDelta(previous.plan, p) : [];
  if (delta.length && !p.scopeChange)
    throw new HatchError(
      "SCOPE_CHANGE",
      "Changing required scope/outcomes needs a source-backed scopeChange record: " +
        delta.join("; "),
    );
  const historyDir = inside(root, `.casehatch/features/${p.featureId}/history`);
  const history = existsSync(historyDir)
    ? readdirSync(historyDir)
        .filter((f) => f.endsWith(".json"))
        .map(
          (f) =>
            readJson(
              inside(root, `.casehatch/features/${p.featureId}/history/${f}`),
            ) as FrozenPlan,
        )
    : [];
  const sameContext = history.filter(
    (h) =>
      digest([...h.plan.sources].sort((a, b) => a.id.localeCompare(b.id))) ===
      digest([...p.sources].sort((a, b) => a.id.localeCompare(b.id))),
  );
  const questions = new Set<string>();
  for (const h of [...sameContext, { plan: p }])
    for (const d of h.plan.decisions)
      questions.add(d.question.trim().toLowerCase());
  if (questions.size > 3)
    throw new HatchError(
      "QUESTION_LIMIT",
      "Revision increments cannot reset the three-question limit for unchanged sources.",
    );
  for (const h of sameContext)
    for (const d of h.plan.decisions) {
      const now = p.decisions.find((x) => x.id === d.id);
      if (
        !now ||
        now.question !== d.question ||
        (d.answer && now.answer !== d.answer)
      )
        throw new HatchError(
          "DECISION_MEMORY",
          `Reuse ${d.id} unchanged while its source context is unchanged.`,
        );
    }
  const frozen: FrozenPlan = {
    schemaVersion: 1,
    plan: p,
    digest: digest(p),
    appliedAt: new Date().toISOString(),
    previousDigest: previous?.digest ?? null,
    scopeDelta: delta,
  };
  atomicJson(
    inside(
      root,
      `.casehatch/features/${p.featureId}/history/${p.scopeRevision}.json`,
    ),
    frozen,
  );
  atomicJson(
    inside(root, `.casehatch/features/${p.featureId}/plan.json`),
    frozen,
  );
  return frozen;
}
