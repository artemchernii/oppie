## Why

The current mock can display discovery results, but no engine produces them. The next increment must
prove one complete path from a loose direction to a human-reviewed Problem without turning jobs,
trends, or complaints into automatic conclusions.

## What changes

- Add a persisted discovery run with explicit status and failure state.
- Store collected sources separately from proposals.
- Support source signal types: workflow, pain, budget, price, demand and context.
- Produce candidate problem proposals with citations, unknowns and linked companies.
- Review proposals in Inbox; acceptance requires a reason and source references.
- Link an accepted proposal to the existing Problem record.
- Add a first source path for Reddit pain evidence and manual URL import for job/freelance/vendor
  sources.
- Add Playwright coverage for the complete source-to-problem flow.

## What does not change

- A job opening proves work or budget, not pain by itself.
- A trend proves attention or demand signal, not a problem.
- No automatic acceptance, rating, probability, market share, TAM or hidden score.
- No scraping of private or restricted sources.
- No broad multi-source crawler, scheduled crawling, teams, billing or notifications.
- Existing Problem and Company records remain the accepted product records.

## Capabilities

### New Capabilities

- `discovery-runs` — run status, collected sources and candidate proposals.
- `source-triage` — attach, discard and preserve source decisions.

### Modified Capabilities

- `problem-discovery` — discovery becomes backed by a traceable run instead of mock-only data.
- `problem-analysis` — analysis begins only after proposal acceptance.
