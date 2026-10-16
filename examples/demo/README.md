# Synthetic CSV-import demo

All requirements, people, and data in this fixture are invented. Run from the CaseHatch repository root after `npm ci`:

```sh
npm run demo
npm run demo:bug
npm run demo
```

`demo.mjs` builds/uses the local CLI, initializes an isolated project configuration in this directory, registers four context files, applies the saved plan, and executes seven tagged cases. Init/import/apply are idempotent for unchanged inputs. Each app launch starts an empty in-memory database; every test uses a unique tenant. The server is local to 127.0.0.1:4179 and must not already be running. Playwright owns its lifecycle.

The normal implementation in [app/server.ts](app/server.ts) satisfies the saved plan. `CASEHATCH_DEMO_BUG=1` enables a labeled bug: retrying with an existing idempotency key creates a second import instead of returning the original job. This simulates a client retry after an uncertain initial response; it does not inject network faults. The requirement comes from [DECISIONS.md](context/DECISIONS.md#dec-02-retry-identity), independently of the implementation.

Show that the pre-existing test misses the bug:

```sh
cd examples/demo
CASEHATCH_DEMO_BUG=1 ../../node_modules/.bin/playwright test --grep 'existing import happy path'
```

Then run the saved behavior checks directly (from this directory):

```sh
CASEHATCH_DEMO_BUG=1 node ../../dist/cli/index.js check --feature csv-import
# exits 1, because the required retry assertion fails
node ../../dist/cli/index.js check --feature csv-import
# exits 0 in fixed mode
node ../../dist/cli/index.js report --feature csv-import --details
node ../../dist/cli/index.js report --feature csv-import --format html > .casehatch/runs/report.html
```

The top-level `demo:bug` script treats exit 1 as the expected demonstration result and exits 0 when it reproduces the defect. The check itself always keeps its normal exit codes. `CASEHATCH_DEMO_BUG` and `PORT` are included in the demo's environment fingerprint; viewing a bug-mode report from fixed mode marks it stale. To inspect bug evidence freshly, set `CASEHATCH_DEMO_BUG=1` for `report` too.

All tests also run directly with `../../node_modules/.bin/playwright test`. No browsers are needed; these cases use Playwright's HTTP request fixture and the normal application server. Authentication is deliberately a tenant header fixture. The parser is intentionally limited to unquoted name,email rows; its exclusions are documented in the accepted decisions and frozen plan.

Artifacts remain under `.casehatch/runs/<run-id>/`: canonical report, reporter event stream, composed runner config, and runner log. Playwright error attachments remain in `test-results`. Re-running does not read old reports to satisfy a gate. No benchmark timings or held-out model comparisons are asserted by this demo.
