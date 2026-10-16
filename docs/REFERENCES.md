# Design references

Reviewed on 15 October 2026. These sources establish available extension mechanisms and testing concepts. CaseHatch's interfaces, timeline and product targets are design proposals, not claims endorsed by the vendors.

| Source | Design relevance |
| --- | --- |
| [Codex: Build skills](https://learn.chatgpt.com/docs/build-skills) | Repository skill discovery under `.agents/skills` and distribution through plugins |
| [Claude Code skills](https://code.claude.com/docs/en/skills) | Repository skill mechanism, commands and argument handling |
| [Codex authentication](https://learn.chatgpt.com/docs/auth) | Existing subscription sign-in and separate API authentication |
| [Claude plan and Agent SDK guidance](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) | Current account-usage guidance; adapter design should not assume permanent billing terms |
| [Playwright reporters](https://playwright.dev/docs/test-reporters) | Custom reporter extension for actual runner results |
| [Playwright annotations](https://playwright.dev/docs/test-annotations) | Exact case IDs carried through native test metadata |
| [Playwright test agents](https://playwright.dev/docs/test-agents) | Existing planning/generation/healing baseline to compare against |
| [Git hooks](https://git-scm.com/docs/githooks) | Pre-push input and failure semantics |
| [Node.js releases](https://nodejs.org/en/about/previous-releases) | Node.js 24 listed as LTS at the design date |
| [Cucumber Example Mapping](https://cucumber.io/docs/bdd/example-mapping/) | Short conversations about rules, examples and unanswered questions |
| [NIST SP 800-142](https://csrc.nist.gov/pubs/sp/800/142/final) | Choosing interaction coverage with practical resource constraints |
| [MIT license](https://opensource.org/license/mit) | Proposed permissive public-repository license |
| [GitHub public name search API](https://api.github.com/search/repositories?q=casehatch+in:name&per_page=10) | Point-in-time name observation; namespace has not been reserved |
| [npm registry name](https://registry.npmjs.org/casehatch) | HTTP 404 at the design check, not a reservation |

The earlier market study is background for this plan. The implementation decisions here incorporate the later requirement for PRD/BRD/ticket context, bounded clarification and quiet routine verification.
