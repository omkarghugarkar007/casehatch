#!/usr/bin/env node
import { VERSION } from "../version.js";
import { Command, Option, CommanderError } from "commander";
import { readFileSync, realpathSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { initialize, uninstallIntegrations, type Agent } from "../init.js";
import { doctor } from "../doctor.js";
import { addSource, exportContext, importSource } from "../context/index.js";
import { applyPlan, validatePlan, loadPlan } from "../plans/index.js";
import { check } from "../check.js";
import { snapshot } from "../runners/playwright/environment.js";
import { html, latestReport, markdown, terminal } from "../reporting/index.js";
import {
  installHook,
  uninstallHook,
  verifyClean,
  verifyPush,
  verifyCommittedFiles,
} from "../hooks/index.js";
import {
  atomicWrite,
  featureId,
  HatchError,
  inside,
  loadConfig,
  readJson,
  withLock,
} from "../store.js";
import type { Report, Source } from "../contracts.js";

const program = new Command()
  .name("casehatch")
  .description(
    "Source-grounded behavior checks before you push. No inference during replay.",
  )
  .version(VERSION);
program
  .option("--cwd <directory>", "project directory", process.cwd())
  .addOption(
    new Option("--format <format>", "output format")
      .choices(["text", "json", "markdown", "html"])
      .default("text"),
  );
program.exitOverride();
const root = () => realpathSync(resolve(program.opts().cwd as string));
const format = () => program.opts().format as string;
const featureOption = (cmd: Command) =>
  cmd.option("--feature <id>", "feature ID (or activeFeature from config)");
const feature = (requested?: string) =>
  featureId(loadConfig(root()), requested);
function output(data: unknown, message?: string) {
  process.stdout.write(
    format() === "json"
      ? JSON.stringify(data, null, 2) + "\n"
      : (message ?? JSON.stringify(data, null, 2)) + "\n",
  );
}
function renderReport(r: Report, details = false, out?: string) {
  const result =
    format() === "json"
      ? JSON.stringify(r, null, 2)
      : format() === "markdown"
        ? markdown(r)
        : format() === "html"
          ? html(r)
          : terminal(r, details);
  if (out && existsSync(inside(root(), out)))
    throw new HatchError(
      "OUTPUT_EXISTS",
      `Preserving existing output file: ${out}. Choose another path or redirect stdout explicitly.`,
    );
  if (out) {
    atomicWrite(inside(root(), out), result + "\n");
    output(
      { path: out, verdict: r.verdict, exitCode: r.exitCode },
      `Saved ${out} (${r.verdict}).`,
    );
  } else process.stdout.write(result + "\n");
  process.exitCode = r.exitCode;
}
function budget(s: string): number {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m)?$/.exec(s);
  if (!match)
    throw new HatchError(
      "BUDGET",
      "Use a positive duration, e.g. 60s, 2m or 500ms.",
    );
  const seconds =
    Number(match[1]) * (match[2] === "ms" ? 0.001 : match[2] === "m" ? 60 : 1);
  if (seconds <= 0 || seconds > 86400)
    throw new HatchError("BUDGET", "Budget must be between 0 and 24 hours.");
  return seconds;
}
featureOption(
  program
    .command("init")
    .description(
      "Initialize config/private-state ignores; optionally install agent skills",
    ),
)
  .addOption(
    new Option("--agent <agent>", "install project skill wrappers")
      .choices(["none", "codex", "claude", "both"])
      .default("none"),
  )
  .option("--config <path>", "existing Playwright configuration")
  .action((opts) =>
    output(
      withLock(root(), () =>
        initialize(root(), opts.agent as Agent, opts.feature, opts.config),
      ),
    ),
  );
program
  .command("doctor")
  .description("Read-only local setup diagnostics")
  .action(() => {
    const report = doctor(root());
    output(
      report,
      report.checks
        .map((c) => `${c.ok ? "OK" : "MISSING"} ${c.name}: ${c.detail}`)
        .join("\n"),
    );
    process.exitCode = report.ok ? 0 : 2;
  });
const context = program
  .command("context")
  .description("Register local source data; export bounded agent context");
featureOption(context.command("add"))
  .requiredOption("--id <id>", "stable source ID")
  .requiredOption("--file <path>", "Markdown/text file")
  .requiredOption("--kind <kind>", "prd|brd|ticket|decision|invariant|other")
  .option("--origin <locator>", "original URL/file locator")
  .action((opts) => {
    const result = withLock(root(), () =>
      addSource(root(), feature(opts.feature), {
        id: opts.id,
        path: opts.file,
        kind: opts.kind as Source["kind"],
        origin: opts.origin,
      }),
    );
    output(
      result,
      `Imported ${result.id} (${result.extraction}; ${result.sha256.slice(0, 12)}).`,
    );
    if (result.extraction === "unreadable") process.exitCode = 2;
  });
featureOption(context.command("import"))
  .requiredOption("--input <path>", "normalized source manifest JSON")
  .action((opts) =>
    output(
      withLock(root(), () =>
        importSource(
          root(),
          feature(opts.feature),
          readJson(inside(root(), opts.input)),
        ),
      ),
    ),
  );
featureOption(context.command("export"))
  .option("--max-chars <number>", "total source text bound", "24000")
  .action((opts) => {
    const max = Number(opts.maxChars);
    if (!Number.isInteger(max) || max < 1 || max > 200000)
      throw new HatchError("CONTEXT_BOUND", "max-chars must be 1..200000.");
    output(exportContext(root(), feature(opts.feature), max));
  });
const plan = program
  .command("plan")
  .description("Validate agent-authored plans and freeze versioned scope");
plan
  .command("validate")
  .argument("<path>", "draft plan JSON")
  .action((path) => {
    const p = validatePlan(readJson(inside(root(), path)));
    output(
      {
        valid: true,
        featureId: p.featureId,
        scopeRevision: p.scopeRevision,
        required: p.obligations.filter((o) => o.scope === "required").length,
      },
      `Valid plan: ${p.featureId}, revision ${p.scopeRevision}.`,
    );
  });
plan
  .command("apply")
  .argument("<path>", "draft plan JSON")
  .action((path) => {
    loadConfig(root());
    const p = withLock(root(), () =>
      applyPlan(root(), readJson(inside(root(), path))),
    );
    output(
      p,
      `Saved ${p.plan.featureId} revision ${p.plan.scopeRevision} (${p.digest.slice(0, 12)}).`,
    );
  });
featureOption(plan.command("show")).action((opts) =>
  output(loadPlan(root(), feature(opts.feature))),
);
featureOption(
  program
    .command("check")
    .description(
      "Execute every required saved case, with no prompts or model calls",
    ),
)
  .option("--budget <duration>", "total runner budget, e.g. 60s")
  .option("--details", "expand all outcomes")
  .option("--out <path>", "save formatted report to a project file")
  .action(async (opts) => {
    const config = loadConfig(root());
    const r = await check(
      root(),
      config,
      featureId(config, opts.feature),
      opts.budget ? budget(opts.budget) : config.budgetSeconds,
    );
    renderReport(r, opts.details, opts.out);
  });
featureOption(
  program
    .command("report")
    .description("Read the latest local execution; invalidate stale results"),
)
  .option("--details", "expand all outcomes")
  .option("--out <path>", "save formatted report to a project file")
  .action((opts) => {
    const config = loadConfig(root());
    renderReport(
      latestReport(root(), config, featureId(config, opts.feature)),
      opts.details,
      opts.out,
    );
  });
const hooks = program
  .command("hooks")
  .description("Opt-in, reversible Git pre-push wrapper");
featureOption(hooks.command("install"))
  .requiredOption("--pre-push", "install the pre-push hook")
  .action((opts) => output(installHook(root(), feature(opts.feature))));
hooks.command("uninstall").action(() => output(uninstallHook(root())));
program
  .command("integrations")
  .description("Remove unchanged CaseHatch-owned agent skill files")
  .command("uninstall")
  .action(() => output(withLock(root(), () => uninstallIntegrations(root()))));
featureOption(program.command("hook", { hidden: true })).action(
  async (opts) => {
    const input = readFileSync(0, "utf8");
    const sha = verifyPush(root(), input);
    const config = loadConfig(root());
    verifyCommittedFiles(root(), Object.keys(snapshot(root(), config).files));
    const r = await check(
      root(),
      config,
      featureId(config, opts.feature),
      config.budgetSeconds,
    );
    verifyClean(root());
    verifyCommittedFiles(root(), Object.keys(r.snapshot.files));
    if (r.snapshot.head !== sha)
      throw new HatchError(
        "PUSH_CHANGED",
        "HEAD changed during hook execution.",
        2,
      );
    renderReport(r);
  },
);
try {
  if (
    Number(process.versions.node.split(".")[0]) < 22 ||
    (Number(process.versions.node.split(".")[0]) === 22 &&
      Number(process.versions.node.split(".")[1]) < 12)
  )
    throw new HatchError(
      "NODE_VERSION",
      "CaseHatch requires Node.js 22.12 or newer.",
    );
  await program.parseAsync();
} catch (e) {
  if (e instanceof CommanderError && e.exitCode === 0) process.exitCode = 0;
  else {
    const error =
      e instanceof HatchError
        ? { code: e.code, message: e.message, exitCode: e.exitCode }
        : e instanceof z.ZodError
          ? {
              code: "SCHEMA_INVALID",
              message: e.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("\n"),
              exitCode: 3,
            }
          : {
              code: e instanceof CommanderError ? "USAGE" : "ERROR",
              message: (e as Error).message,
              exitCode: 3,
            };
    if (format() === "json")
      process.stdout.write(
        JSON.stringify({ schemaVersion: 1, error }, null, 2) + "\n",
      );
    else process.stderr.write(`CaseHatch ${error.code}: ${error.message}\n`);
    process.exitCode = error.exitCode;
  }
}
