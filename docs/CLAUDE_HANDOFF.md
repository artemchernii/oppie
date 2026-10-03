# oppie.lab — Claude handoff

Date: 2026-10-03  
Branch: `feat/discovery-engine` (stacked on `feat/problem-ratings-table`, PR #44)  
Base commit: `71ba9dd docs: hand off the analysis surfaces, and point STATUS at something true`

## Read first

1. `AGENTS.md`
2. `STATUS.md`
3. `docs/PRODUCT_DIRECTION.md`
4. `docs/ENGINE_IMPLEMENTATION_BRIEF.md`
5. `openspec/changes/discovery-engine-v1/`
6. `docs/handoffs/HANDOFF_ANALYSIS_SURFACES.md`

The repository is intentionally dirty. Preserve all existing work. Do not reset, discard, or
switch branches. Do not commit to `master`.

## Product in one paragraph

The user gives a loose direction, not a problem statement. oppie.lab collects evidence from jobs,
freelance marketplaces, Reddit/forums, vendors, prices, trends and geography; then proposes painful
workflows for human review. Evidence, unknowns, assumptions and kill reasons must stay separate.
The engine may collect and suggest. It must not silently conclude, score, forecast, estimate market
size, or invent a price.

## Current product surfaces

- `/discover` — direction-first discovery (`app/Discovery.tsx`). Creates a run, ingests sources,
  builds proposals, and renders only the stored run (`?run=<id>`); demo data removed 2026-10-04.
- `/inbox` — persisted queue (`GET /api/inbox`): keep/discard sources; accept (reason + ticked
  sources) or reject (reason) discovery proposals; last 10 decisions. Done 2026-10-04.
- `/` — Problems list.
- `/problems/[id]` — Problem detail, evidence, ratings, and the discovery decision trail (5.3).
- `/companies` — company, price, geography and data-gap surfaces.
- `/companies/[id]` — company detail.
- `/opportunities` — legacy board; retired from active navigation, do not extend it.

## Completed implementation

### Discovery backend

- Contracts: `lib/discovery.ts`
- Ingestion: `lib/ingestion.ts`
- Conservative proposal generation: `lib/proposals.ts`
- Persistence/routes: `lib/discoveryRemote.ts` and `app/api/`
- Run creation/read:
  - `POST /api/discovery-runs`
  - `GET /api/discovery-runs/:id`
- Source ingestion:
  - `POST /api/discovery-runs/:id/sources`
  - `POST /api/discovery-runs/:id/ingest`
  - `POST /api/discovery-sources/:id/triage`
- Inbox: `GET /api/inbox`
- Proposal generation: `POST /api/discovery-runs/:id/proposals`
- Human acceptance: `POST /api/discovery-proposals/:id/accept`
- Acceptance creates a new Problem or links an existing Problem, preserves selected citations and
  unknowns, and never fills readiness signals.
- Company links use exact canonical URL matches only. Existing company amounts remain verbatim;
  incomparable figures are never summed.
- Source URLs are canonicalized. Tracking parameters are removed; meaningful identifiers such as
  Indeed/Upwork job query ids are retained.
- Source metadata preserved through ingestion and reads: excerpt, citation, source type, signal
  type, link status, triage, and `foundFor` query provenance.

### Database

The owner applied both migrations in Supabase:

- `supabase/migrations/20261005000000_discovery_engine.sql`
- `supabase/migrations/20261006000000_discovery_acceptance.sql`

The second migration adds `problem_id` to `discovery_proposals` and `discovery_sources`, with
foreign keys to `public.problems`. A live read confirmed these columns and foreign keys exist.
The live database currently has zero rows in `discovery_proposals`, so there is no real accepted
Problem to inspect yet. Do not create fake production data to manufacture that verification.

### Tests and handoff policy

- `scripts/discovery.test.js` covers contracts, ingestion, URL canonicalization, metadata mapping,
  proposal unknowns, company matching, and acceptance mapping.
- `e2e/discovery.spec.mjs` has 3 passing tests:
  1. direction → source → proposal stays human-gated;
  2. acceptance fails without reason/source;
  3. direction → run → source → triage → proposal → accept returns a Problem id.
- `codex.settings.json`, `AGENTS.md` §10, and `STATUS.md` define the required response footer:
  Summary, Done, Now, Next, You. Every manual action must be numbered under You, followed by a
  copy-paste continuation prompt.

## OpenSpec state

`openspec list` currently reports `discovery-engine-v1` ✓ complete (all 25 tasks, 2026-10-04).

Completed: persistence, acceptance boundary, source paths, URL deduplication, metadata
preservation, proposal generation, company/price linking, and Playwright failure/no-auto-accept
coverage.

Remaining tasks:

None. The work is in PR #44 (ratings) and the stacked `feat/discovery-engine` PR.

Do not start Python or broad scraping yet. Do not add a new market-size model. The next practical
slice is UI persistence: finish `/discover`, then `/inbox`, then verify an accepted Problem.

## Verification history

Passed:

- `pnpm test` — 41 + 23 + 12 + 17 + 11 + 7 assertions.
- `pnpm exec tsc --noEmit`
- `git diff --check`
- `pnpm test:e2e` — 3 passed.
- `pnpm exec openspec list` — 18/25.

Not run:

- `pnpm build` — intentionally deferred while the local dev server is active. Run it only after
  stopping the dev server.

Playwright can render server pages via `lib/playwrightFixtures.ts` (test-only, never in production).

Known test-server warning: Playwright logs `42501 permission denied for table problems` while the
layout reads the real Problems table, but discovery tests mock their discovery API calls and all 3
tests pass. Do not hide this warning; resolve permissions separately when doing authenticated live
verification.

## First instruction for Claude

Continue without asking what to do next. Start by reading `STATUS.md` and this handoff. Implement
the next unfinished OpenSpec task, beginning with replacing `/discover` demo result output with
persisted discovery run/source/proposal data. Preserve the current editorial visual direction.
Add tests, run safe checks, update `STATUS.md`, and finish with the required Summary/Done/Now/Next/You
footer plus a copy-paste continuation prompt. Do not invent conclusions, scores, probabilities,
market size, prices, or accepted Problems.

## Copy-paste prompt

```text
Continue oppie.lab: #44 is merged, sync and land the discovery PR.
```
