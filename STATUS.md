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

Nothing is required. When #45 is merged, the open follow-ups are, in rough order of value:

1. Create one real accepted Problem: `/discover` → save a real source → build a proposal → accept it
   in `/inbox` with a reason. Nothing real has gone through the loop yet.
2. Add Reddit credentials to `.env.local` (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`,
   `REDDIT_USER_AGENT`) to try live collection.
3. Replace the hardcoded "Fintech · reconciliation" label on `/companies`.

## Suggested next prompt

```text
Continue oppie.lab: put one real source through the loop with me.
```
