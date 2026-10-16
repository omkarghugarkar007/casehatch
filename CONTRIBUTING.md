# Contributing to CaseHatch

CaseHatch is a working local MVP for TypeScript + Playwright. Read [implementation status](docs/STATUS.md) before selecting an item from [the backlog](docs/BACKLOG.md). Original backlog IDs are planning identifiers, not GitHub issue numbers.

## Setup

Use Node.js ≥22.12 and npm:

```sh
npm ci
npm run verify
npm run demo:bug
npm run smoke
npm run format:check
```

Tests run real Playwright processes without a browser. Use `npm run format` for runtime source, tests, scripts, schemas, integrations and current implementation docs. Dependency versions are locked; commit package-lock.json changes with intentional dependency updates.

## Small first contributions

- [Runner teardown regression coverage (#1)](https://github.com/omkarghugarkar007/casehatch/issues/1): preserve attempts and ensure a teardown failure cannot become READY.
- [Troubleshooting incomplete verification (#2)](https://github.com/omkarghugarkar007/casehatch/issues/2): give users supported repairs without weakening their required scope.
- [HTML report escaping regression coverage (#3)](https://github.com/omkarghugarkar007/casehatch/issues/3): keep adversarial source text inert in standalone exports.

Additional runners, connectors, broader scope selection and runtime dependencies need a short design discussion. The first supported vertical slice should stay easy to reproduce.

## Pull requests

Lead with the user-visible behavior and relevant acceptance criteria. Describe meaningful checks and unsupported paths. Preserve source provenance, expected outcomes, frozen denominators, question accounting, actual execution evidence and concise success output. Do not demote requirements, remove cases, weaken assertions or add skips to fix a failing gate. Do not overwrite user hooks, reporters, runner config or agent instructions.

Private context and run artifacts are ignored by default. Review generated plan metadata before committing it. Examples must be synthetic. Documentation-only changes need link/format review, not invented runtime tests.

The project is MIT licensed. By contributing, you agree that your contribution is provided under the same license. Use [Discussions](https://github.com/omkarghugarkar007/casehatch/discussions) for questions and design proposals. External agent comparisons and design-partner research remain separate validation work; do not mark them complete based on local contract tests.
