# Naming decision

## Recommended name: CaseHatch

Tagline: **Behavior checks before you push.**

Short description: **Turn product context into the checks your feature needs.**

Proposed CLI: `casehatch check`.

The name is pronounceable as "case hatch," refers to discovering test cases and leaves room for source-grounded behavior beyond literal written requirements. It avoids implying that the tool proves universal correctness. The developer practice remains "behavior checks" so users do not need to learn a new testing category to understand it.

## Point-in-time checks

Checked on 15 October 2026:

| Check | Observed result |
| --- | --- |
| GitHub public repository search: `casehatch in:name` | HTTP 200, `total_count: 0` |
| npm registry: `https://registry.npmjs.org/casehatch` | HTTP 404 |
| Exact-name web search | No obvious software/testing product surfaced; some results refer to a person's name |

These checks establish observations at that time, not a reservation, trademark clearance, domain availability or a permanent uniqueness guarantee. Recheck before public repository and package creation. A GitHub search does not inspect private repositories.

## Alternatives considered

- **SpecHatch:** also had zero GitHub name-search results and npm HTTP 404 at the check; useful fallback, but its name emphasizes documents more narrowly than CaseHatch.
- **CaseNudge:** the same namespace checks were clear; communicates a gentle workflow, but understates the execution/coverage component.
- **Elsecase:** rejected after the API search revealed an existing software repository under that exact name.
- **BehaveKit:** rejected after web search revealed an existing behavioral-health app using the name.
- **IntentLint:** rejected after finding an existing npm package and a research system using the name.
- **CaseLoom / Prooflane / ScopeCheck:** existing software uses surfaced.

## Brand discipline

Use CaseHatch consistently in public text and `casehatch` in command/package names. Start with a clear wordmark and a recognizable coverage matrix. A mascot, desktop animation, domain purchase and branding site are not prerequisites for the first useful public release.

The repository should earn attention through a reproducible missed-behavior example. The name supports that story; it does not substitute for it.
