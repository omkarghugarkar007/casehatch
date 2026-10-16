# Public repository and launch plan

## Repository identity

- Working name: **CaseHatch**.
- Tagline: **Behavior checks before you push.**
- Repository: [omkarghugarkar007/casehatch](https://github.com/omkarghugarkar007/casehatch).
- Description: "Turn PRDs and tickets into source-grounded Playwright checks for Codex and Claude Code. Replay locally and in CI without a model API key."
- Suggested topics: `testing`, `behavior-testing`, `scenario-testing`, `claude-code`, `codex`, `playwright`, `developer-tools`, `test-coverage`.
- License: [MIT](../LICENSE).
- Initial runtime maturity: `v0.1.0-alpha.1`, with clear supported-path limitations.

The public GitHub repository exists. The compiled tarball has passed an isolated installation smoke; the [README](../README.md) documents checkout and GitHub-release installation. There is no npm registry release. This document retains the distribution plan; [implementation status](STATUS.md) and [validation](VALIDATION.md) distinguish shipped work from remaining evidence.

## Settings and project setup

Issues, Discussions and private vulnerability reporting are enabled. Three small contributor issues have concrete acceptance criteria and are linked from [CONTRIBUTING.md](../CONTRIBUTING.md). Historical backlog IDs remain planning identifiers; completed local implementation work is not duplicated as new open issues. Broader milestones and branch protection can follow the initial CI runs and contributor workflow.

Use the included issue/PR templates. Keep the first contribution path small: diagnostics, example context, a runner-state fixture or documentation reproduction. Ask for a short design discussion before new connectors, runners or major runtime dependencies.

## Demo storyboard

Use a tiny synthetic CSV-import app with resettable data and clearly labeled intentional bugs.

1. Show a small existing test suite passing.
2. Show the relevant BRD/PRD/ticket and CaseHatch's two consequential questions.
3. Show a missing retry/duplicate case and the expected idempotent outcome.
4. Generate a normal Playwright API/browser test and reproduce the actual bug.
5. Fix the implementation and rerun `casehatch check`.
6. Show the concise passing summary, defined scope and an optional deferred concern.

A 30-45 second clip can focus on steps 3-6; a longer walkthrough explains context and questions. Publish the exact fixture revision, commands and run artifacts. Screenshots and timings must come from the implementation, not illustrative JSON.

## README acceptance checklist

- The opening explains the user outcome in one sentence.
- Maturity and supported stack are obvious.
- One working installation path is verified from a clean checkout/machine.
- The demo exposes a real seeded defect, clearly labeled as synthetic.
- A short explanation says what 100% covers and what remains unknown.
- Ordinary generated tests can run without CaseHatch's model workflow.
- Existing agent limits and context handling are described accurately.
- No fake CI badge, unmeasured speed promise or broad correctness claim appears.
- Contribution instructions, issue templates, security reporting and license are ready.

## Distribution sequence

Start with five design partners already using agents and Playwright. Repair first-run friction before broad launch. Then share a reproducible technical post, a short demo, a Show HN submission and relevant developer-community posts. Explain limitations and publish the native-agent comparison.

The useful sharing object is a concise change report and a saved regression test. Build optional redacted report export after the local result is useful. Do not post project announcements or create issues on other people's repositories automatically.

## Measure

Measure successful first runs, accepted distinct scenarios, reproduced regressions, repeated weekly repository use, questions avoided through remembered decisions and contributor activity. Stars, views and package downloads are distribution signals. There is no credible guarantee of GitHub virality.
