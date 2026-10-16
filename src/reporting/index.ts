import { existsSync } from "node:fs";
import type { Config, Report } from "../contracts.js";
import { loadPlan, planContextProblems } from "../plans/index.js";
import { snapshot } from "../runners/playwright/environment.js";
import { HatchError, inside, readJson } from "../store.js";
export function latestReport(
  root: string,
  config: Config,
  feature: string,
): Report {
  const pointer = inside(root, `.casehatch/runs/latest-${feature}.json`);
  if (!existsSync(pointer))
    throw new HatchError(
      "REPORT_MISSING",
      `No local run for ${feature}. Run casehatch check first.`,
      2,
    );
  const latest = readJson(pointer) as { runId: string };
  if (!/^[a-f0-9-]{36}$/.test(latest.runId))
    throw new HatchError("REPORT_INVALID", "Invalid run pointer.");
  const report = readJson(
    inside(root, `.casehatch/runs/${latest.runId}/report.json`),
  ) as Report;
  if (
    report.schemaVersion !== 1 ||
    report.origin !== "casehatch-check" ||
    report.runId !== latest.runId ||
    report.featureId !== feature
  )
    throw new HatchError(
      "REPORT_INVALID",
      "Illustrative/imported data is not a CaseHatch run.",
    );
  const frozen = loadPlan(root, feature);
  const current = snapshot(root, config);
  if (
    frozen.digest !== report.planDigest ||
    current.digest !== report.snapshot.digest ||
    current.head !== report.snapshot.head ||
    planContextProblems(root, frozen.plan).length
  ) {
    report.caseResults = report.caseResults.map((r) => ({
      ...r,
      status: "stale",
      reason:
        "Saved evidence no longer matches current plan, context, source or environment. Rerun check.",
    }));
    report.coverage = {
      ...report.coverage,
      planned: 0,
      planningPercent: report.coverage.required ? 0 : null,
      executed: 0,
      passed: 0,
      executionPercent: report.coverage.required ? 0 : null,
      passingPercent: report.coverage.required ? 0 : null,
    };
    report.verdict = "INCOMPLETE";
    report.exitCode = 2;
    report.problems.push("Saved evidence is stale. Run casehatch check.");
  }
  return report;
}
export function summary(r: Report): string {
  const c = r.coverage;
  if (r.verdict === "READY")
    return `Behavior checks: ${c.passed}/${c.required} passed — 100% of agreed scope (revision ${r.scopeRevision}).`;
  if (r.verdict === "NO_SCOPE")
    return `NO_SCOPE: no required obligations (revision ${r.scopeRevision}); verification incomplete.`;
  return `${r.verdict}: ${c.executed}/${c.required} outcomes exercised; ${c.passed}/${c.required} passed (revision ${r.scopeRevision}).`;
}
export function terminal(r: Report, details = false): string {
  const lines = [summary(r)];
  if (r.verdict !== "READY" || details) {
    for (const p of r.problems.slice(0, details ? 100 : 3))
      lines.push(`  ${p}`);
    for (const c of r.caseResults
      .filter((c) => details || c.status !== "passed")
      .slice(0, details ? 1000 : 5)) {
      lines.push(
        `  ${c.caseId} [${c.project || "default"}] ${c.status}: ${c.reason}`,
      );
      if (details || c.status === "product_failed")
        lines.push(`    Expected: ${c.expectedOutcome}`);
      const error = c.attempts.flatMap((a) => a.errors)[0];
      if (error)
        lines.push(
          "    Observed: " +
            error.replace(/\x1B\[[0-9;]*m/g, "").slice(0, details ? 3000 : 400),
        );
    }
    if (details)
      for (const s of r.sourceRecords)
        lines.push(
          `  Source: ${s.id} → ${s.path} (${s.origin}; ${s.sha256.slice(0, 12)})` +
            (s.retrieval
              ? `; MCP snapshot fetched ${s.retrieval.fetchedAt}; remote freshness not checked by CLI`
              : ""),
        );
    lines.push(`  Artifacts: ${r.artifacts}/report.json`);
    if (!details)
      lines.push(
        `  Details: casehatch report --feature ${r.featureId} --details`,
      );
  }
  const concerns = r.deferredConcerns.filter((c) => details || !c.acknowledged);
  if (concerns.length)
    lines.push(
      details
        ? concerns.map((c) => `  Deferred: ${c.title} — ${c.reason}`).join("\n")
        : `  ${concerns.length} optional concern(s) deferred; expand with report --details.`,
    );
  return lines.join("\n");
}
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const md = (s: string) =>
  s.replace(/[\\`*_{}\[\]<>|]/g, "\\$&").replace(/\r?\n/g, " ");
export function markdown(r: Report): string {
  const c = r.coverage;
  return `# CaseHatch · ${md(r.featureId)}\n\n${md(summary(r))}\n\nScope revision ${r.scopeRevision} · run ${r.runId} · ${r.elapsedMs} ms\n\n| Agreed outcomes | Planned | Exercised | Passed |\n| --- | --- | --- | --- |\n| ${c.required} | ${c.planned} | ${c.executed} | ${c.passed} |\n\n${r.problems.map((p) => "- " + md(p)).join("\n")}\n\n| Case | Project | State | Expected outcome |\n| --- | --- | --- | --- |\n${r.caseResults.map((c) => `| ${c.caseId} | ${md(c.project || "default")} | ${c.status} | ${md(c.expectedOutcome)} |`).join("\n")}\n\nArtifacts: ${md(r.artifacts)}\n\nSource hashes and full attempts: report.json. This is coverage of the saved scope, not exhaustive correctness.\n`;
}
export function html(r: Report): string {
  const e = escapeHtml;
  const c = r.coverage;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>CaseHatch · ${e(r.featureId)}</title><style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui,sans-serif;background:#101718;color:#ecf2ed}*{box-sizing:border-box}body{max-width:1080px;margin:auto;padding:56px 28px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #31413e;padding-bottom:22px}.brand{font-size:18px;font-weight:700;letter-spacing:-.5px}.pill{border:1px solid #577267;color:#c3e5c9;border-radius:24px;padding:6px 12px;font-size:12px}h1{font-size:clamp(30px,5vw,48px);letter-spacing:-1.8px;max-width:850px;margin:42px 0 14px}p,small{color:#aebdb5;line-height:1.6}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:34px 0}.metric{border:1px solid #31413e;border-radius:12px;padding:22px}.metric strong{display:block;font-size:32px;margin:8px 0}h2{font-size:18px;margin:36px 0 16px}details{border-top:1px solid #31413e;padding:18px 0}summary{cursor:pointer;line-height:1.6}summary span{font-size:12px;color:#b0ccbb;margin-left:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#192421;padding:18px;border-radius:8px;font-size:12px}code{font-size:12px;overflow-wrap:anywhere}footer{margin-top:48px;border-top:1px solid #31413e;padding-top:20px}a{color:#bed9a8}@media(max-width:600px){.metrics{grid-template-columns:repeat(2,1fr)}body{padding:28px 18px}}
</style><header><div class="brand">◒ CaseHatch</div><span class="pill">${r.verdict}</span></header><main><h1>${e(r.featureId)}<br>Behavior before you push.</h1><p>${e(summary(r))}</p><small>Scope revision ${r.scopeRevision} · ${e(r.startedAt)} · ${(r.elapsedMs / 1000).toFixed(2)}s</small><section class="metrics">${[
    ["Agreed outcomes", c.required],
    ["Planned", c.planned],
    ["Exercised", c.executed],
    ["Passed", c.passed],
  ]
    .map(
      ([label, n]) =>
        `<div class="metric"><small>${label}</small><strong>${n}</strong></div>`,
    )
    .join(
      "",
    )}</section>${r.problems.length ? `<h2>Verification gaps</h2><ul>${r.problems.map((p) => `<li>${e(p)}</li>`).join("")}</ul>` : ""}<h2>Required cases</h2>${r.caseResults.map((c) => `<details${c.status !== "passed" ? " open" : ""}><summary><code>${e(c.caseId)}</code> · ${e(c.project || "default")} <span>${c.status}</span></summary><p>Expected: ${e(c.expectedOutcome)}</p><p>${e(c.reason)}</p><pre>${e(JSON.stringify({ binding: c.binding, attempts: c.attempts }, null, 2))}</pre></details>`).join("")}<details><summary>Scope, sources and deferred concerns</summary><pre>${e(JSON.stringify({ obligations: r.obligations, sources: r.sourceRecords, scopeDelta: r.scopeDelta, deferredConcerns: r.deferredConcerns }, null, 2))}</pre></details></main><footer><small>Coverage describes the saved agreed scope. It cannot prove every business requirement was discovered.<br>Run <code>${e(r.runId)}</code> · plan <code>${e(r.planDigest)}</code><br>Artifacts: <code>${e(r.artifacts)}</code></small></footer></html>`;
}
