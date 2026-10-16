# Architecture

CaseHatch is one modular TypeScript ESM package. Node.js ≥22.12 runs the compiled CLI; Playwright 1.63.x–1.64.x is a local peer dependency. Runtime dependencies are Commander and Zod. The [original design baseline](../IMPLEMENTATION_PLAN.md) proposed Node 24; the implemented baseline also supports Node 22.12+ and has CI configured for 22/24.

| Module                         | Responsibility                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/contracts.ts`, `schemas/` | Strict versioned records and generated editor schemas                                               |
| `src/context/`                 | Text import, origin/hash/limits, source-linked bounded exports                                      |
| `src/plans/`                   | Structural provenance validation, stable IDs, decisions, revision history and scope changes         |
| `src/runners/playwright/`      | Local runner resolution, snapshots, exact case bindings, process budget and runtime reporter events |
| `src/coverage/`                | Pure state transitions and all-case/all-project obligation roll-up                                  |
| `src/check.ts`                 | Fresh check transaction, readiness, report persistence; no evidence reuse                           |
| `src/reporting/`               | One canonical report, terminal/JSON/Markdown/standalone HTML, saved-evidence freshness              |
| `src/hooks/`                   | Opt-in reversible ordinary Git hook wrapper and HEAD integrity checks                               |
| `src/cli/`                     | Noninteractive commands, machine errors, stable exit codes                                          |
| `integrations/casehatch/`      | One shared native-agent skill installed for Codex and/or Claude Code                                |
| `tests/`                       | Contracts, actual runner negatives, freshness, hook lifecycle and source/plan history               |
| `examples/demo/`               | Synthetic API fixture, ordinary Playwright tests, independently documented intended outcomes        |

## Data and execution

The current agent interprets relevant sources and proposes a plan; the CLI never performs inference. Sources retain original paths/origins, content hashes, capture times and extraction limits. Imported text is data. Apply validates linkage/history and freezes the plan digest, revision, previous digest and scope delta. Semantic grounding still requires source review.

Ticket/document retrieval uses the current coding-agent harness's existing MCP connection, including Atlassian for Jira/Confluence. The shared skill discovers the available read/search tools, saves a source-preserving local export, and calls `context import`. Optional MCP provenance records the connection/tool labels, resource type/ID, provider-reported version/update time (explicit null when absent), and retrieval time. The CLI validates and retains that record without creating an MCP client or copying harness credentials. Remote data and metadata remain agent-supplied context, not execution evidence. Saved checks/hooks/CI verify the imported version offline; they do not establish live remote freshness. See [the shared MCP workflow](../integrations/casehatch/references/mcp.md).

A check takes a conservative project snapshot, validates current source hashes and resolved scope, then starts local Playwright using structured arguments. A temporary config beside the original composes its existing reporters with CaseHatch's reporter, preserving relative paths and the original config content. A per-invocation run ID/token separates reporter events from older illustrative/imported data. It is an accidental-mixing safeguard, not an adversarial sandbox against code running in the same trusted project.

The reporter records collected tags/files/projects/test IDs, result/expected status, all retry attempts, Playwright expect events under mapped outcome steps, errors and attachment paths. An append-only stream retains completed attempts on interruption. The CLI does not accept a user-supplied evidence/report file to satisfy a gate. It compares snapshots again after execution, then rolls every required case/project variant into the frozen obligation denominator. Only complete, fresh passing scope can be READY. No source or denominator is rewritten by the runner.

## Local state

| Path                                           | Contents                                                              | Default handling                      |
| ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| `casehatch.config.json`                        | Runner, feature, budget, output exclusions and environment-key recipe | Review and commit; no credentials     |
| `.casehatch/features/ID/sources/`              | Provenance/extraction manifests                                       | Review for privacy before committing  |
| `.casehatch/features/ID/plan.json`, `history/` | Frozen plans, decisions, obligations and scope changes                | Reviewable source metadata            |
| `.casehatch/context/`                          | Raw normalized snapshots                                              | Git ignored                           |
| `.casehatch/runs/`                             | Run evidence, logs, canonical reports, latest-run pointers            | Git ignored                           |
| `.casehatch/locks/`                            | Serialized writer/check lock                                          | Git ignored                           |
| `.casehatch/installation.json`                 | Hash ownership of installed skill files                               | No credentials; used for safe removal |
| Ordinary test directories                      | Normal repository Playwright files and fixtures                       | Repository-owned test code            |

File/metadata writes are atomic. A project lock prevents overlapping CaseHatch context/plan/check writes. The CLI does not promise a cryptographically append-only audit log against a developer who edits local state. It records history and detects edited frozen plans; every gate executes tests again.

## Native agents and boundaries

The same skill installs in `.agents/skills/casehatch` for Codex and `.claude/skills/casehatch` for Claude Code. It has plan/check/explain guidance and a progressive plan reference. Init never edits AGENTS.md or CLAUDE.md. Providers keep their own authentication, permissions and quotas. See [OpenAI's skill documentation](https://learn.chatgpt.com/docs/build-skills) and [Claude Code's skill documentation](https://code.claude.com/docs/en/skills) for native discovery.

The supported slice is one package, one selected feature, explicit projects, local text, ordinary Playwright assertions and a resettable fixture. There is no hosted service, dashboard, connector authentication, credential copying, new LLM key, dependency-impact inference, inference in hooks, or automatic result reuse. External mutable systems, source relevance, assertion meaning and undiscovered requirements require review. [Status and remaining work](STATUS.md).
