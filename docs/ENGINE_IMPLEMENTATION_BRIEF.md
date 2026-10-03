# Discovery engine and backend implementation brief

## Plain goal

The user gives a direction, not a problem.

For example: **“financial operations in European RIAs.”** The engine gathers public evidence, finds repeated painful workflows, identifies the people doing and paying for the work, and proposes problem records for a person to review.

The engine may collect and suggest. It must not silently decide that a problem is real, that a price is a market fact, or that a suggestion belongs in the product records.

The first useful vertical is fintech operations, especially reconciliation. The first release should make one narrow discovery run traceable from source to accepted problem. It does not need a complete market report.

## What the current mock already establishes

The mock UI is the product contract for the first implementation pass:

| Surface | User sees | Backend must provide |
| --- | --- | --- |
| `/discover` | A direction, candidate opportunities, proof lanes, companies, prices, geography, and unknowns | A discovery run with source-backed candidate proposals and explicit gaps |
| `/inbox` | Untriaged sources and suggestions waiting for a person | Collected sources, proposal state, and accept/reject actions |
| `/problems/[id]` | An accepted problem, evidence, five-question analysis, unknowns, and kill reasons | A problem record with traceable evidence and human-written decisions |
| `/companies` | Observed employers, vendors, prices, geography, counts, and market-data gaps | Company records with exact figure, basis, source status, and kind |
| `/companies/[id]` | One company’s figure, source, related problems, and limits | A source-backed company record; unknown fields stay visible |

The Companies page calls its charts **market evidence**, not market size. Current counts are counts of records in the research set. They are not revenue, market share, TAM, growth, or probability.

## Engine boundary

### Input

`DiscoveryInput`

- `direction`: the user’s loose text
- optional `geography`, `role`, `workflow`, and `constraint` hints
- `createdBy` and timestamps

### Collection

The engine runs source adapters by class. The first adapter should be a source that exposes repeated work in public—job postings or procurement notices are the best starting candidates because they reveal workflow, actor, employer, location, and sometimes a salary or tool requirement.

Each adapter returns a raw `CollectedSource` with:

- canonical URL and source class
- title, publisher, and observed date
- raw excerpt and citation span
- location and geography when present
- named actor or role when present
- workflow language and business-model language when present
- exact price or salary, currency, basis, and amount note when present
- fetch status and link status

Source classes remain separate: job, procurement, pricing, community, regulation, review, and company. Do not blend their signals into one hidden confidence number.

### Normalisation and clustering

1. Canonicalise URLs and remove duplicate captures.
2. Extract citation spans; every proposed field keeps its source and reason.
3. Normalize obvious spelling and geography variants without erasing the original text.
4. Cluster repeated workflow language, not broad industry labels.
5. Produce a proposal with the repeated evidence, actors, payer hypothesis, current workaround, companies, prices, geography, and missing questions.

The engine can say **“this workflow appeared in 4 collected sources”** when four source records support it. It cannot turn that count into a score or forecast.

### Human boundary

- Collection never creates an accepted Problem.
- Extraction never writes a rating without a person accepting it.
- A proposal is not evidence until it is attached to a record through an explicit action.
- Accepting a proposal writes the accepting person, reason, and source beside the accepted value.
- Rejecting a proposal keeps the source and the rejection reason; it does not erase the research trail.
- Unknown, assumption, evidence, and kill reason remain separate fields in the UI and storage.

## Backend shape

Use the existing repository records and persistence rules as the starting point. Do not introduce a second parallel data model for the mock.

The minimum additions are:

### `discovery_runs`

- id, direction, optional hints
- status: `queued | collecting | ready | failed`
- created/updated timestamps
- error text when a run fails

### `collected_sources`

- id, run id, source class, canonical URL
- title, publisher, observed date, raw excerpt, citation span
- extracted actors, workflows, geography, and price fields
- `triage`: `untriaged | attached | discarded`
- link/fetch status and created timestamp

### `proposals`

- id, run id, title, plain-language problem statement
- workflow, worker, payer, workaround, business pattern
- linked source ids and linked company ids
- explicit unknowns and kill reasons
- state: `waiting | accepted | rejected`
- decision reason, decided by, decided at

### Existing records

An accepted proposal links to or creates the existing Problem record. Company records continue to hold exact published figures and their basis. If a new field is needed, document the decision in the OpenSpec change before adding it.

## API and frontend implementation

Start with server-side route handlers or server actions that return the same shapes the mock already renders. Keep the frontend dumb about research logic:

- `POST /api/discovery-runs` creates a run and returns its id.
- `GET /api/discovery-runs/:id` returns status, candidates, evidence, companies, and gaps.
- `GET /api/inbox` returns untriaged sources and waiting proposals.
- `POST /api/sources/:id/attach` attaches a source with a reason.
- `POST /api/sources/:id/discard` records a discard reason.
- `POST /api/proposals/:id/accept` accepts only with a reason and source references.
- `POST /api/proposals/:id/reject` records a rejection reason.
- `GET /api/problems/:id` and `GET /api/companies/:id` power the detail surfaces.

The first run may be synchronous behind a clear loading state. Move to a job queue only when collection duration or retries require it. A failed adapter must leave the run inspectable and must not create partial accepted records.

## Market evidence, not fake market intelligence

For fintech → reconciliation, the first backend should collect:

- reconciliation roles and repeated workflow phrases from job postings;
- procurement and implementation language;
- public vendor pricing and price basis;
- company location and customer segment;
- source dates and link status;
- regional differences across EU, UK, US, and Asia when sources support them.

The UI may chart observed record counts, source counts, and published figures by basis. It must not chart a market total, share, growth rate, or probability until a separately defined dataset and method exist.

## Playwright acceptance tests

Add end-to-end tests after the first API slice, using the current routes as the contract:

1. Discovery: enter a direction, run discovery, and see a candidate with proof lanes.
2. Discovery integrity: candidate shows its source count and an explicit unknown; no hidden score appears.
3. Inbox: untriaged source appears; attach requires a workflow/payer reason; discard requires a reason.
4. Proposal acceptance: accept requires a reason and source; the accepted problem appears in Problems.
5. Problem detail: evidence, unknowns, and empty fields render distinctly; no empty field becomes zero.
6. Company detail: exact price, basis, source status, and related problem are readable.
7. Failure path: a failed run shows an error and creates no accepted problem.
8. No automatic conclusion: loading or refreshing never accepts a proposal or writes a rating.

Prefer stable `data-testid` values only for actions and durable state boundaries, not every visual element. The tests should assert user-visible wording and semantic state.

## Delivery order

1. Freeze the current mock vocabulary and routes.
2. Add persistence for discovery runs, sources, and proposals.
3. Implement one source adapter for job or procurement evidence.
4. Add run status and result APIs.
5. Replace mock discovery data with the API response.
6. Implement inbox attach/discard and proposal decisions.
7. Link accepted proposals to the existing Problem surface.
8. Add company/source detail loading.
9. Add the Playwright flow and failure-path tests.
10. Add more adapters only after one complete traceable run works.

## Explicit non-goals

- No autonomous problem acceptance.
- No hidden composite score or fake probability.
- No market-size chart made from company-row counts.
- No automatic rating, price normalization, or regional conclusion without a cited source and human acceptance.
- No backend rewrite before the first source-to-problem path is testable.
