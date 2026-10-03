## Context

The product starts with a loose direction such as “financial operations in European RIAs”. The
engine must discover the problem by combining different kinds of evidence. Source classes have
different meanings and must not be collapsed into one score:

| Source | Primary signal |
| --- | --- |
| Reddit/forums | pain, workaround, consequence |
| jobs | workflow, role, tools, salary budget |
| Fiverr/Upwork | outsourced work, buyer language, price |
| vendor pages | existing business, scope, price basis |
| Google Trends/trend platforms | demand and context |
| Amazon/Shopify | product and commerce context |

The first implementation uses Reddit through an allowed API path and manual URL import for the
other sources. This avoids making the product depend on fragile scraping while the source contract
is still being tested.

## Records

### `discovery_runs`

```text
id, direction, hints, status, error, created_at, updated_at
```

`status` is one of `queued`, `collecting`, `ready`, or `failed`. A failed run is inspectable and
does not create an accepted Problem.

### `collected_sources`

```text
id, run_id, source_type, signal_type, canonical_url,
title, publisher, observed_at, excerpt, citation,
workflow, actor, geography, amount, currency, basis,
query_provenance, link_status, triage, created_at
```

`triage` is `untriaged`, `attached`, or `discarded`. Untriaged sources count in no evidence total.
The original excerpt and citation stay beside every extracted field.

### `proposals`

```text
id, run_id, title, workflow, actor, payer,
workaround, business_pattern, unknowns, kill_reasons,
source_ids, company_ids, status,
decision_reason, decided_by, decided_at
```

`status` is `waiting`, `accepted`, or `rejected`. Accept and reject are human decisions. An
accepted proposal must contain a non-empty reason and at least one source reference.

## Engine boundary

1. Collect raw sources.
2. Canonicalize and deduplicate URLs.
3. Extract cited fields with their source spans.
4. Group repeated workflows.
5. Generate a proposal with evidence, unknowns and possible business patterns.
6. Stop and wait for Inbox review.

The engine may say a workflow appears in a number of collected sources. It may not interpret that
count as market share, probability or proof of pain.

## API contract

```text
POST /api/discovery-runs
GET  /api/discovery-runs/:id
GET  /api/inbox
POST /api/sources/:id/attach
POST /api/sources/:id/discard
POST /api/proposals/:id/accept
POST /api/proposals/:id/reject
GET  /api/problems/:id
GET  /api/companies/:id
```

The API returns the same shapes the current mock renders. The frontend does not implement source
collection, clustering or acceptance rules.

## Human boundary

- Loading a run never accepts a proposal.
- Refreshing a page never accepts a proposal.
- An accepted proposal writes its decision reason and source references.
- Empty fields render `Not added yet`.
- Evidence, unknowns, assumptions and kill reasons stay separate.
- A collected source is not evidence until a person triages it.

## First vertical slice

Use one fintech/reconciliation fixture set and one real source path:

1. Create a run from `/discover`.
2. Collect Reddit posts/comments for selected subreddits and terms.
3. Allow manual source URL capture for LinkedIn, Indeed, Fiverr, Upwork and vendor pages.
4. Show sources in `/inbox`.
5. Attach a source or discard it with a reason.
6. Show a waiting proposal with citations and unknowns.
7. Accept it with a reason.
8. Show the resulting Problem with linked evidence.

## Playwright acceptance

- A direction creates a run.
- A ready run displays at least one cited source and one explicit unknown.
- An untriaged source is not counted as evidence.
- Attach and discard require reasons where specified.
- Accept requires a reason and a source.
- Refreshing does not change proposal state.
- A failed run creates no accepted Problem.
- Existing company figure/basis and Problem empty-field rules remain intact.
