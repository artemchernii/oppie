# Tasks

## 1. Contract and persistence

- [x] 1.1 Add the `discovery_runs`, `discovery_sources`, and `discovery_proposals` persistence shapes.
- [x] 1.2 Add normalization tests for empty fields, link status, signal type and triage state.
- [x] 1.3 Add the acceptance boundary test: no proposal becomes a Problem without a reason and source.
- [x] 1.4 Preserve existing Problem and Company persistence invariants.

## 2. API

- [x] 2.1 Add `POST /api/discovery-runs`.
- [x] 2.2 Add discovery run source/proposal reads.
- [x] 2.3 Add source attach/discard actions with reasons.
- [x] 2.4 Add proposal acceptance with server-side validation.
- [x] 2.5 Return explicit failed-run state without partial acceptance.

## 3. First source paths

- [x] 3.1 Add Reddit API source adapter for selected subreddits and search terms.
- [x] 3.2 Add manual URL import for LinkedIn, Indeed, Fiverr, Upwork and vendor pages.
- [x] 3.3 Canonicalize and deduplicate source URLs.
- [x] 3.4 Preserve excerpt, citation, source type, signal type and query provenance.

## 4. Proposal generation

- [x] 4.1 Extract workflow text and preserve actor/payer unknowns separately.
- [x] 4.2 Group repeated workflow evidence without producing a hidden score.
- [x] 4.3 Generate candidate problems with source bundles and explicit unknowns.
- [x] 4.4 Link observed companies and exact prices without totaling incomparable figures.

## 5. UI integration

- [x] 5.1 Replace `/discover` mock run output with the run API.
- [x] 5.2 Replace `/inbox` mock sources and proposals with persisted data.
- [x] 5.3 Show accepted evidence on `/problems/[id]`.
- [x] 5.4 Preserve the current `/companies` and `/companies/[id]` source/price semantics.

## 6. End-to-end verification

- [x] 6.1 Add Playwright coverage for direction → run → source → proposal → Problem.
- [x] 6.2 Add failure-path coverage.
- [x] 6.3 Add no-auto-accept coverage across reload.
- [x] 6.4 Run `pnpm test`, TypeScript checks, `git diff --check`, and the production build with the
      dev server stopped.
