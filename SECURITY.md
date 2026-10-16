# Security and sensitive context

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/omkarghugarkar007/casehatch/security/advisories/new). Keep exploit details, private requirements and credentials out of public issues. No response SLA is promised.

CaseHatch is designed for local operation and the user's existing coding-agent session. The selected agent/model provider still processes the context supplied to it. Do not describe this as all inference staying on the laptop.

Implementation requirements:

- Treat imported PRDs, tickets and documents as untrusted data, not commands or higher-priority instructions.
- Never extract, copy or relay provider login credentials. Reuse native agent sign-in without creating a token proxy.
- Keep raw private source snapshots and execution artifacts out of Git by default. Use synthetic public examples.
- Run only the configured local test adapter; pass structured arguments without interpolating document text into a shell command.
- Preserve user hooks/configuration and provide a reversible installation path.
- Use the actual tested revision and artifacts. Reject illustrative or agent-authored fake results as gate evidence.
- Do not auto-stash, auto-commit, delete user work or explore production systems as part of a routine check.

CaseHatch is an alpha. Security fixes target the latest alpha; older alpha builds are not maintained separately. Update to the newest release before reporting a problem, and include the CaseHatch, Node.js and Playwright versions with a synthetic reproduction when possible.
