# oppie.lab — current status

Last updated: 2026-10-04

## Branch and commit

- PR [#44](https://github.com/artemchernii/oppie/pull/44) (ratings table) merged to `master` 2026-10-04.
- PR [#45](https://github.com/artemchernii/oppie/pull/45) `feat/discovery-engine` → `master`: discovery
  engine v1 (OpenSpec `discovery-engine-v1`, complete) and the editorial redesign.
- `pnpm build` passed 2026-10-04 with the dev server stopped (OpenSpec 6.4).
- Never commit or push directly to `master`

## What is complete

### Visual product mock

The current mock has these usable routes:

- `/discover` — direction-first discovery surface, now rendering the persisted run (see below)
- `/inbox` — source review and proposal acceptance surface
- `/` — tracked Problems list
- `/problems/[id]` — problem detail and evidence/rating surface
- `/companies` — companies, prices, geography, market evidence, and explicit data gaps
- `/companies/[id]` — company detail with figure, basis, source status, and related problems
- `/opportunities` — legacy board, retired from active navigation but not deleted

The visual system is now dark and editorial:

- orange: actions and important figures;
- violet: structure, charts, and selected surfaces;
- green: good/confirmed;
- red: bad/blocked;
- gray: neutral/unknown.

The logo and favicon use the custom rounded-square O mark with a white ring and orange center.
Text selection is intentionally orange background with dark text.

### Product direction

The user provides a loose direction such as:

> financial operations in European RIAs

The engine discovers workflows, people doing the work, payers, repeated evidence, companies,
business models, prices, geography, and copy/adapt/start hypotheses. The user does not provide the
problem statement.

### Engine planning

The implementation brief is saved at [`docs/ENGINE_IMPLEMENTATION_BRIEF.md`](docs/ENGINE_IMPLEMENTATION_BRIEF.md).

The agreed source strategy is:

- job boards: workflow, role, tools, and salary budget;
- Fiverr/Upwork: outsourced work and price language;
- Reddit/forums: complaints, workarounds, and consequences;
- vendor pages: existing products, buyers, and prices;
- Google Trends and trend platforms: supporting demand/context signals;
- Amazon/Shopify: product and commerce context, not proof of a painful workflow.

A source must be labelled by signal type. A job post is not automatically a problem, and a trend is
not automatically pain.

### `/discover` reads stored runs (OpenSpec 5.1, done 2026-10-04)

Plain version: the Discover page used to show two made-up example ideas ("Small RIA teams reconcile
broker files by hand", with a Duco price and "Strong/Medium" region ratings) no matter what you did.
It now shows only what is saved in the database for the run you opened. An empty run says
"No proposals yet"; a field nobody filled in says "Not added yet".

Precise version:

- `app/DiscoveryMock.tsx` is renamed to `app/Discovery.tsx`; the hardcoded `candidates` array is gone.
- `app/discover/page.tsx` reads `?run=<id>` with `readDiscoveryRun` and lists the 8 newest runs with
  `listDiscoveryRuns`, server-side, as the signed-in person (RLS applies). A reload reopens the same run.
- After each create / ingest / build-proposal action the client re-reads `GET /api/discovery-runs/:id`,
  so the page shows stored rows, not the POST response.
- `GET /api/discovery-runs/:id` now returns typed proposals plus the linked company rows
  (`id, name, role, amount, location`; `amount` verbatim, never parsed or summed).
- `lib/discoveryView.ts` is the pure view model: counts are row counts only; sources are grouped
  Work / Pain / Money / Demand-and-context and never combined into a score; discarded and missing
  cited sources are named, not dropped.
- `lib/discovery.ts` gains `discoveryProposalFromRow` and `discoveryRunFromRow`. Unknown stored values
  fall to the safe side: proposal status → `waiting` (never `accepted`), run status → `failed`,
  signal → `context`, link status → `unverified`, triage → `untriaged`. Blank optional text stays absent.
- Removed from `/discover` because nothing stored backs them: the region "Strong/Medium/Unknown"
  decision aid and the inert Accept/Reject buttons. Acceptance stays in `/inbox`, where a reason is
  required. The page links there ("Review in Inbox").

### `/inbox` reads and decides stored proposals (OpenSpec 5.2, done 2026-10-04)

Plain version: Inbox used to show a fixed starter list kept only in this browser (e.g. the Opturo
pricing source and "P-005 · 2/3" rating suggestions). It now shows only what is in the database:
sources nobody has judged yet, and discovery proposals waiting for you. To accept a proposal you
must tick the sources that support it and write a reason; to reject one you must write a reason.
The last 10 decisions are listed with their reason and a link to the Problem.

Precise version:

- `app/Inbox.tsx` no longer uses `useResearch` / `useProblems`; `app/inbox/page.tsx` reads
  `readDiscoveryInbox()` and the Problem list server-side. Every action re-reads `GET /api/inbox`.
  A "Reload from database" button is always shown.
- `GET /api/inbox` now returns `{ sources, proposals, citedSources, decided }`: untriaged sources,
  waiting proposals (typed), every source those proposals cite (kept ones included), and the last
  10 decided proposals.
- New `POST /api/discovery-proposals/:id/reject` (`rejectDiscoveryProposal`): a reason is required.
- Zero-row writes now fail loudly: triage of an already-triaged source, rejecting a non-waiting
  proposal, and an acceptance race (which reports the Problem id that was still written).
- `lib/discoveryInbox.ts` is the pure layer: discarded and missing cited sources are never
  selectable; nothing is pre-ticked; an existing-Problem target sends `problemId`, "new" does not.
- `DiscoveryProposal.problemId` is now read from `problem_id`.
- Source triage "attached" is labelled **Keep source** in the UI. It does not attach to a Problem
  by itself; the link to a Problem is made only by accepting a proposal.
- The legacy browser-local rubric suggestions are no longer in Inbox. They still appear, and can
  still be accepted, on each `/problems/[id]` page (`ProblemDetail.tsx` uses `useResearch`).
  `lib/research*.ts` and the `oppie.lab.research` localStorage key are untouched.

### `/problems/[id]` shows how accepted evidence got there (OpenSpec 5.3, done 2026-10-04)

Plain version: a Problem created from a discovery proposal now has a "How this was accepted"
section: the proposal, the direction it came from, the date, the reason you wrote, and each source
you ticked — marked "in evidence below" or "removed from the record since" if you later deleted it.
Evidence that came from discovery carries a small "from discovery · accepted <date>" tag; evidence
typed in by hand carries nothing extra.

Precise version:

- `readProblemDiscoveryTrail(problemId)` in `lib/discoveryRemote.ts` reads accepted proposals with
  that `problem_id`, their runs' direction, and the selected sources. Read-only.
- `lib/problemTrail.ts` (pure) compares that trail with `problem.evidence` by the id acceptance
  writes (`ev-<sourceId>`); unit-tested to match `discoverySourceToEvidence`.
- `app/problems/[id]/page.tsx` passes `trail` / `trailError`; a failed trail read is shown, not hidden.
- `lib/playwrightFixtures.ts`: one fixture Problem and trail for the isolated test server, active only
  when `PLAYWRIGHT_TEST=1` and `NODE_ENV !== "production"` (same gate as the middleware bypass;
  unit-tested). This is what lets Playwright render server-side pages without a session.

### "Paid today" warning in Inbox (owner chose option a, 2026-10-04)

Plain version: in Inbox, a source that would flip "Paid today" to yes now says so next to its
checkbox ("Accepting this can answer “Paid today” with yes, citing this job post"). The rule itself
is unchanged.

Precise version: `PAID_TODAY_EVIDENCE_TYPES` is exported from `lib/analysis.ts` and used by both
`evaluatePaid` and `answersPaidToday` in `lib/discoveryInbox.ts` (which goes through
`discoverySourceToEvidence`). A unit test runs each source type through acceptance and the real
rubric and checks the warning matches the verdict.

### Failed runs and no partial acceptance (OpenSpec 2.5, done 2026-10-04)

Plain version: if collecting or proposal-building fails, the run is marked failed with the error,
and `/discover` shows it in red. You cannot accept a proposal from a failed run. Accepting is now
all-or-nothing: if the Problem can't be saved, the proposal goes back to "waiting" instead of being
stuck half-accepted, and a retry cannot create a second Problem.

Precise version:

- Run status: `source-saved` → `collecting`, `proposals-built` → `ready`, any collection/storage
  failure → `failed` with `error` (`runStatusAfter`, `markRun` in `lib/discoveryRemote.ts`). Input
  errors (bad URL, duplicate source, missing Reddit env) do not fail a run. A later success clears it.
- `acceptanceBlockedByRun` refuses acceptance for a failed or unreadable run.
- `runAcceptance` in `lib/discoveryAcceptance.ts`: claim (waiting → accepted, conditional) → write
  Problem → link `problem_id` → mark sources kept. A failed Problem write releases the claim; if the
  release also fails the error names the stuck state. After the Problem exists, failures are
  returned as a `warning` shown in Inbox, never as silent success. Every path is unit-tested.
- `scripts/discovery.test.js` now awaits each test; before, an async test would have passed unrun.

### Company figures and gaps (OpenSpec 5.4, done 2026-10-04)

Plain version: company prices are still shown exactly as written with their basis and never added
together. Empty location, role and source-note cells used to show as blank; they now say
"Not added yet". These blanks predate the redesign (they are on `master` too).

Precise version: `/companies` money tables and country table, and `/companies/[id]` header and role,
render "Not added yet" for empty `location`, `role`, `amountNote`. `lib/playwrightFixtures.ts` gains
three companies (USD per year, EUR per user/month, one with every gap) so Playwright covers
`/companies`, `/companies/[id]` and the company rows on `/discover`.

Noted, not changed: `/companies` has a hardcoded eyebrow "Fintech · reconciliation" above
"Market evidence so far". It describes today's records and will be wrong once other directions
are researched.

### Found while testing: `anon` still has grants on the newer tables

Plain version: with no sign-in, the discovery tables answer "empty" instead of "not allowed".
No data leaks, but a broken session looks like "you have no proposals". A fix is written and
needs to be pasted into Supabase.

Precise version: `supabase/migrations/20261007000000_revoke_anon_on_later_tables.sql` revokes
`anon` on `problem_ratings`, `discovery_runs`, `discovery_sources`, `discovery_proposals`. The
init migration's revoke loop only covered tables that existed then. **Applied by the owner
2026-10-04**; the Playwright server now logs `42501 permission denied for table problem_ratings`
where it previously got an empty list.

### Light theme (fixed 2026-10-04)

Plain version: the redesign only worked in dark mode; in light mode most headings were near-white on
white (1.11:1 contrast). Light mode now has its own warm-paper palette and every page reads. Dark
mode is unchanged, checked pixel for pixel on six pages.

Precise version: `app/globals.css` gains 33 `--ed-*` colour roles. Their dark values are the
redesign's original hexes; light values are chosen per role (darker orange/violet for text, bright
ones kept for fills and shadows). A Playwright test measures heading/label contrast in light mode on
`/`, `/inbox`, `/companies`, `/companies/[id]`, `/problems/[id]`, `/discover` and fails below 4.5:1.

### Automatic collection with real data (2026-10-04)

Plain version: "Run discovery" now fetches real sources by itself in three lanes: **pain** (Reddit
via Brave search, Hacker News), **businesses** already selling around it with their published
prices (Brave), and **money** (Remotive job posts). It then builds one proposal for you to review.
Two real runs are stored: "financial operations in European RIAs" (29 sources) and "invoice chasing
for small agencies" (36 sources, 16 of them pain, 12 with prices).

Precise version:

- `lib/collectors.ts`: query plan, provider mappers, injected `fetch`. Labels are earned by the text:
  `pain` needs pain wording (bare "hours" does not count), `price` needs a figure, `budget` needs a
  stated salary; otherwise `context`. Every result must mention a direction word; jobs need two.
- `POST /api/discovery-runs/:id/collect` (`collectRun`): stores results as untriaged sources; a run
  fails only if every provider failed, and each failed provider is named.
- `pnpm discover:dry "direction"` prints real results without writing. `pnpm discover:run
  "direction"` stores a run with the secret key (admin, like `load:companies`); it only adds rows.
- Proposals group collected sources by direction (`foundFor` = `direction · lane: query`).
- Reddit's own API refuses anonymous requests (403); Reddit content comes through Brave instead.

### Runs split into distinct pains, each with who already sells a fix (2026-10-04)

Plain version: a run is now split into separate pains, and each pain lists the businesses selling a
fix for it, with their quoted prices. A language model suggests the split; the code then checks
every quote word for word against the stored sources and throws out anything unsupported. The
"invoice chasing for small agencies" run is split into 4 real pains, now waiting in Inbox.

Precise version:

- `lib/painSplit.ts`: prompt + JSON schema, `checkSplit` (cited ids must exist; quotes verbatim;
  pain evidence from the pain lane; businesses from the business lane; unquoted prices stripped;
  every drop counted), `proposalsFromSplit` (one waiting proposal per pain; repetition and "no
  business found" stated from the evidence, not the model).
- `POST /api/discovery-runs/:id/split` calls AI Gateway (`google/gemini-2.5-flash` on the free tier by default;
  set `AI_GATEWAY_MODEL=anthropic/claude-sonnet-5.5` for finer splits, about $0.03 a run with paid credits) over its OpenAI-compatible endpoint, no new package. Auth: `AI_GATEWAY_API_KEY`,
  else the Vercel OIDC token.
- Run discovery: collect → split; if the split fails it falls back to one combined proposal and
  says why on the page.
- `pnpm discover:split <run> [--save] [--from file.json]`.
- Free tier verified 2026-10-04 (card on file, no credits bought): Gemini 2.5 Flash split the invoice
  run into 3 pains in ~58s; the checker dropped 3 misquotes and 13 wrong business citations. Claude
  models need paid credits. The 4 stored pains were split by Claude in the coding session.

## What is not built

- Discovery run/source/proposal APIs are connected; the first proposal-generation path is now implemented.
- No Python collector or real source adapter exists yet; the first backend API boundary now exists.
- Reddit adapter and manual job/freelance/vendor URL ingestion exist; no runtime Reddit credentials
  or real source collection has been exercised yet.
- No source-backed market dataset has been added beyond the current seeded research records.
- Playwright coverage is saved in `e2e/discovery.spec.mjs`; `pnpm test:e2e` passes 3 tests on the isolated test server, including successful acceptance.
- The follow-up linkage migration `supabase/migrations/20261006000000_discovery_acceptance.sql` has been applied by the owner.
- No automatic conclusion, rating, probability, market share, or TAM is allowed.

## Exact next implementation

The OpenSpec change is saved at `openspec/changes/discovery-engine-v1/`. The first backend slice is
now started:

The durable Claude handoff is saved at [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md).

```text
direction
→ discovery run
→ collected source
→ cited pain/workflow evidence
→ proposal
→ human accept/reject in Inbox
→ Problem with linked evidence
```

Completed in the first slice:

- discovery contract types in `lib/discovery.ts`;
- Supabase persistence migration for runs, sources and proposals;
- `POST /api/discovery-runs`;
- `GET /api/discovery-runs/:id`;
- `POST /api/discovery-runs/:id/sources`;
- `POST /api/discovery-sources/:id/triage`;
- `GET /api/inbox`;
- `POST /api/discovery-runs/:id/ingest` for Reddit or manual URL capture;
- `POST /api/discovery-runs/:id/proposals` for conservative, human-gated proposal generation;
- proposal acceptance boundary at `POST /api/discovery-proposals/:id/accept`;
- server-side validation requiring a reason and source ids;
- human acceptance that creates a new Problem or links an existing one, preserving selected citations and unknowns;
- pure tests for new Problem mapping and existing Problem citation merging.

Remaining for this slice:

1. Exercise acceptance against the real Supabase tables and verify the created/linked Problem on `/problems/[id]`.
2. Add real Reddit credentials in the runtime and exercise a permitted API search.
3. Replace `/discover` mock run output with persisted run/source/proposal data.

Add official Upwork, Google Trends, vendor pricing, and trend-platform integrations after this
source-to-problem path works end to end. Do not make the first implementation depend on fragile
scraping of LinkedIn, Indeed, or Fiverr.

## Proposed backend contract

Minimum records:

- `discovery_runs`
- `collected_sources`
- `proposals`
- existing `Problem` and `Company` records

Minimum routes:

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

## Verification already run

- Browser screenshots inspected: `/discover`, `/inbox`, `/`, `/problems/P-005`, `/companies`, and
  `/companies/c-duco`, including the earlier narrow/mobile pass.
- 2026-10-04: `pnpm test` — passed: 41 + 23 + 12 + 17 + 21 + 7 assertions (discovery 11 → 21:
  normalization and the `/discover` view model).
- 2026-10-04: `pnpm test:e2e` — 3 passed; the first test now drives a stateful mock of the stored run and
  asserts no demo candidate, no region rating, no accept button, and "Not added yet" gaps.
- 2026-10-04: screenshots of `/discover` empty, with a run (desktop) and at 390px checked.
- 2026-10-04: `pnpm exec openspec list` — `discovery-engine-v1 21/25` after 5.2.
- 2026-10-04 (5.2): `pnpm test` discovery 21 → 27 assertions; `pnpm test:e2e` 5 passed (2 new Inbox
  tests: accept blocked without reason/source then sends exactly the ticked source; reject blocked
  without reason). Screenshots of `/inbox` checked in light and dark.
- 2026-10-04 (5.3): `pnpm test` discovery 27 → 32; `pnpm test:e2e` 6 passed (new: trail shown on an
  accepted Problem, with kept/removed/missing sources and the origin tag only on discovery evidence).
  `openspec list` — `discovery-engine-v1 22/25`.
- 2026-10-04 (a, 2.5, 5.4): `pnpm test` discovery 32 → 40; `pnpm test:e2e` 10 passed (new: failed run on
  /discover, Paid-today warning + failed-run refusal in Inbox, company figures/gaps on /companies,
  /companies/[id] and /discover). `openspec list` — `discovery-engine-v1 24/25`.
- Playwright's isolated server moved from port 3100 to 3110: an unrelated Vite dev server was on 3100.
- `pnpm exec tsc --noEmit` — passed.
- `git diff --check` — passed.
- `pnpm test:e2e` — passed: 3 tests on the isolated server, including successful acceptance; the sandbox required elevated permission to bind port 3100.
- Live Supabase read — confirmed zero discovery proposals currently exist; no accepted Problem exists to verify yet.
- Source metadata preservation — citation, source type, signal type, excerpt, and `foundFor` query provenance now survive manual ingestion and persisted reads.
- Company linking — exact vendor URL matches populate proposal company links; unmatched vendors remain unknown and prices are never totaled.
- `pnpm build` — intentionally not run while the dev server on :3000 is running. Still owed (task 6.4).

## Next checks before opening a PR (done 2026-10-04; kept for the record)

1. Finish the OpenSpec `discovery-engine-v1` proposal/design/tasks.
2. Implement and test the first backend slice.
3. Run `pnpm test` and `pnpm build` only after stopping the dev server.
4. Review the browser flow again.
5. Commit with a Conventional Commit message.
6. Open a PR from `feat/problem-ratings-table`.

## Owner action

1. Nothing to buy: splitting runs on the free tier. Buy AI Gateway credits only if you want the finer
   Sonnet splits, then set `AI_GATEWAY_MODEL=anthropic/claude-sonnet-5.5` in Vercel.
2. Review the invoice pains in `/inbox`; reject the two older combined proposals with a reason.

## Suggested next prompt

```text
Continue oppie.lab: run discovery on 3 new directions and compare the pains.
```
