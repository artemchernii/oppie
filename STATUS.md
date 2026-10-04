# oppie.lab — current status

Last updated: 2026-10-04

## Branch and commit

- `master` at `24ea033` (2026-10-04). All work through PR #65 is merged; the Ideas board is on
  `feat/ideas-board`.
- Handoff for the next session: [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md) — the owner
  decides ideas on the new board; next build links Pursue to a tracked problem.
- Never commit or push directly to `master`

## What is complete

### Ideas board is the home page (2026-10-04, `DECISIONS.md` #10)

Plain version: the app now opens on **Ideas** — 11 cards, one per theme the 30 searches covered.
Each card shows how many complaints and sellers were found, the cheapest and dearest real price,
a one-word badge (Crowded, Real budget, Already served, Not proven, Too broad) and one line saying
whether it is worth your time. Click a card for four boxes and Pursue / Park / Drop. The old
Problems list is now "Tracked problems" at `/problems`.

Precise version:

- Idea records: `lib/ideas.ts` (agent notes, reviewed by PR). Live counts and quotes:
  `lib/ideaRemote.ts`. Decisions: `idea_decisions` (migration `20261008000000_idea_decisions.sql`,
  **to be applied by the owner**; it also records the NIS2 park).
- Live counts on 2026-10-04: contract renewals 34 complaints / 24 sellers; invoice chasing 24 / 30;
  supplier certificates 23 / 12; SME compliance 16 / 9; AML and KYC 15 / 24; NIS2 15 / 52;
  finance for small firms 14 / 9; EU seller rules 9 / 13; Portugal 7 / 9; credit control abroad
  3 / 47 (non-English pain is stored as context); e-invoicing 0 / 1.
- Every price on a card was checked to appear word for word in the stored business lines; every
  quote is a stored source excerpt.
- Tests: `scripts/ideas.test.js` (9), `e2e/ideas.spec.mjs` (5), contrast check extended to the
  new pages. The menu now wraps on phones (it overflowed at 375px once it had four links).
- `scripts/persistence.test.js` is not run by `pnpm test`; `AGENTS.md` § 4 still refers to it.


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
- The model sees sources as short labels (`S1`, `S2`…) that the code maps back to real ids. With
  the real ids, Gemini dropped the `src-` prefix and garbled digits, so the checker refused every
  quote in one run (0 of 4 pains kept); with labels the same run kept 5 pains.

### Runs so far (2026-10-04, all real data, all pains waiting in /inbox)

| Direction | Sources (pain) | Pains kept | Notes |
|---|---|---|---|
| invoice chasing for small agencies | 36 (16) | 4 | split by Claude in-session; strongest copy signal |
| compliance work European SMEs still do in spreadsheets | 35 (16) | 8 | priced fixes, e.g. compliance software 7,500–15,000 EUR/year |
| businesses to adapt for small financial firms | 34 (10) | 5 | fractional finance priced $300–$3,464/month |
| boring B2B services in Portugal for solo founders | 35 (7) | 5 | generic (sales, overwhelm); direction too vague |
| financial operations in European RIAs | 29 (4) | not split | only the combined proposal |
| vendor certificate and insurance tracking for small businesses | 30 (12) | 1 | 9 sources; 7 businesses sell a fix (e.g. $13–$19 per vendor/year, free plans up to 25–50 vendors); US-centred (COI, W-9) |
| supplier certificate and insurance tracking for small businesses in Europe | 33 (11) | 3 | same COI market, mostly US vendors plus UK Supplio (£599–£2,399/year); no fix found for supplier contracts in spreadsheets (2 sources) or EU GPSR for UK sellers (1 source) |
| late invoice payment chasing for small agencies in Europe | 30 (6) | 5 | crowded with cheap tools (Trove £50/month, Chaser $233/month); a human chasing service sits between tools and $650/month bookkeeping |
| manual KYC and AML checks for small fintechs in Europe | 28 (9) | 4 | verification is crowded ($0.10–$6 per check); outsourced compliance analysts (Complium) is the service angle; 1 source |
| GPSR compliance for small online sellers shipping to the EU | 33 (6) | 5 | not a gap: EU Responsible Person services €195–€549/year, €400 one-time per product type, €199/month support; only "managing compliance data across thousands of listings" had no fix (1 source) |
| supplier contract renewals tracked in spreadsheets by small businesses | 29 (14) | 1 | strongest repetition so far (11 sources); fixes priced for mid-market and enterprise ($450/month, CLM $15K+/year); a source says a spreadsheet is fine up to ~25 contracts, which is a possible kill reason for the small-business end |
| contract renewal reminder software for small businesses (paid-today test) | 27 (7) | 3 | small businesses already pay: RenewalTime $8/user/month, PandaDoc $19/user, Oneflow free + $20/month, Contract Hound $95/month, ExpiryEdge $99/month; the "no cheap fix" earlier was a search gap. Crowded at every tier. Prices are from vendor pages and listicles, not customer counts |
| outsourced credit control and invoice chasing service for small agencies | 27 (2) | 1 | service exists cheaply in the UK: £50 + VAT per hour, minimum £100/month (Confident Cashflow); software Trove £50/month; pain cited by 17 sources |
| outsourced AML compliance analyst service for small fintechs | 32 (6) | 3 | real budget: outsourced staffing $0–$80,000/year vs $120,000+ for a hire; needs AML expertise, a barrier to copying |
| done-for-you contract and renewal management service for small businesses | 36 (13) | 6 | part-time outsourced support from $699/month vs software $7–$700/month; 8 sources call software too expensive or complex for small firms |
| credit control outsourcing — Germany (Forderungsmanagement und Mahnwesen Outsourcing für kleine Unternehmen) | 21 | 2 | many providers (Büroservice firms, call centres, factoring, Inkasso); software from 59 €/month; service prices mostly not published |
| credit control outsourcing — Netherlands (debiteurenbeheer uitbesteden voor kleine bedrijven) | 20 | 2 | most developed and transparent: €3.95–€4.50 per call (Debiservice), from €45/month + ~€1.50 per action, €0.30–€2.50 per invoice or 2–8%; one provider says small firms can usually do it themselves |
| credit control outsourcing — Spain (externalizar gestión de cobros para pymes) | 28 | 2 | software-led (Holded 59 €/month); outsourced cobros firms (Cobratis, recovery agencies); prices not published |
| credit control outsourcing — Poland (windykacja polubowna outsourcing dla małych firm) | 22 | 5 | amicable collection on 7–30% commission; half the run was IT outsourcing until the filter fix in #56 |
| mandatory B2B e-invoicing for small businesses in Belgium and Germany | 25 | 2 | Belgian Peppol mandate (2026) confuses small firms (8 sources); many free or low-cost providers (Billit, B2BRouter, Mercurius, Odoo); "inspecting received UBL invoices locally" had no fix found (2 sources); Germany barely surfaced |
| OSS VAT returns for small EU online sellers | 27 | 3 | served and priced: hellotax OSS reports from 41 €/month, filings from 75 €/month; Eurofiscalis |
| NIS2 cybersecurity compliance for small suppliers | 27 | 3 | price gap: consultancy 15,000–250,000 EUR one-time, platforms $30,000–50,000/year "aren't designed for startups"; small suppliers are pulled in by customers' supplier checks; 4 sources on scope confusion |
| NIS2 small-supplier gap test (English + German runs, plus price searches) | 49 | 6 | the small fixed-price fix exists but is thin: GreenOnion (AT) supplier evidence package 1,900–3,900 EUR fixed; TSMONDO tool from 49 €/month; templates and a free applicability check; next tier is a 4,500 € gap assessment, then 15,000 €+ consultancy. Only one fixed-price package found in German searches. The checker dropped 14 German quotes the free model miscopied |
| NIS2 buyer side — 4 runs: "supplier security requirements NIS2 large companies", "NIS2 Lieferantenanforderungen Informationssicherheit Lieferanten", "third-party risk management NIS2 supplier questionnaire", "NIS2 supply chain security clause supplier contract" | 100 (6) | 9 | the engine's lanes find sellers, not buyers: 9 pains, all described by vendors; Remotive found 0 jobs; the checker dropped 3 quotes and 1 business. Buyer evidence came from direct searches instead — see "NIS2 buyer-side demand" below |
| NIS2 supplier side, paid-today test — 2 runs: "security questionnaire completion service for small suppliers", "Lieferantenfragebogen Informationssicherheit ausfüllen Dienstleister" | 36 (7) | 1 + 1 combined | the English run found automation tools (AutoRFP.ai, quote-based); the German run found no quotable pain and stored one combined proposal. Priced services came from direct searches — see "NIS2 supplier-side paid-today test" below |
| Owner's edge — 6 runs (EU/UK representative for Chinese, Korean and Vietnamese sellers; bookkeeping for Ukrainian- and Russian-speaking businesses in the UK, Poland and US; website and booking setup in the UK and US) | 179 | 17 | aimed at markets with money, not Portugal (owner, 2026-10-04). EU representative: law-forced, €150–€1,190/year, 0 complaints found; diaspora bookkeeping: 21 complaints, $200–$600/month typical, Russian-speaking service from $750/month; booking setup: 13 complaints, tools free to $39/month. Three new idea cards with a "Your edge" line and linked market facts (29,044 Ukrainian-owned companies in Poland; ~26,600 in the UK; Chinese sellers 50.03% of Amazon's global active sellers) |

`pnpm discover:run` now splits into pains first, like the button, and falls back to one combined
proposal only when the split cannot run. The five older combined proposals can be rejected in Inbox
as superseded.
- Free tier verified 2026-10-04 (card on file, no credits bought): Gemini 2.5 Flash split the invoice
  run into 3 pains in ~58s; the checker dropped 3 misquotes and 13 wrong business citations. Claude
  models need paid credits. The 4 stored pains were split by Claude in the coding session.

### Service businesses: first comparison (2026-10-04)

Plain version: for each strong pain, a human service already exists, and at the small end it is
priced close to software (UK credit control from £100/month). The service with the biggest budget
is AML compliance for fintechs, but it needs real expertise. The repeated pattern is that cheap
software exists and the human layer is thin, regional, or expert-only.

Outside the UK (2026-10-04): outsourced credit control exists in all four countries checked. The
Netherlands is mature with transparent per-call and per-invoice prices; Germany and Spain have many
providers but rarely publish prices; Poland sells it as commission-based collection. No empty
market was found. The only untested angle is a transparent fixed monthly price where prices are
hidden (Germany, Spain) — a hypothesis, not evidence.

### NIS2 buyer-side demand (2026-10-04)

Plain version: yes, big customers really are sending security demands to their suppliers, and some
put it in the contract. RWE's standard purchase terms let it demand security questionnaires,
interviews and evidence from any supplier, and cancel the contract over a false answer. Diehl
Defence's supplier form, dated September 2026, asks whether you fall under NIS2. But the trail is
thin: 5 of the 9 companies whose supplier documents were read, and only 2 of those name NIS2. And it does not yet show
that a small supplier pays anyone to answer — Baumann, for example, offers a free self-assessment
every 3 years as the alternative to a certificate. **Demand evidence: real but weak — upgraded
from "~4 complaints" to 5 named buyers, not yet to money.**

Precise version. Primary documents fetched and read (not snippets):

| Buyer | Document | What it demands | Names NIS2? |
|---|---|---|---|
| RWE | General purchase and payment terms (EZB), 08/2025, §29–30 | any supplier: answer RWE security questionnaires, interviews, evidence on information security and critical-infrastructure protection; false answer = material breach and termination. OT suppliers: pre-qualification self-assessment (PIO) valid 3 years, OT security acceptance test, audits on 8 weeks' notice | no (cites critical infrastructure) |
| Diehl Defence | Supplier self-disclosure EKFO0005 v27.0, 11.09.2026 | asks whether the supplier falls under the NIS2 implementation act (important / especially important / no) and for ISO 27001, BSI IT-Grundschutz or NIST certification | **yes** |
| Baumann Group | Information security requirements for suppliers | three tiers by data sensitivity: normal = ISO 27001, ISO/IEC 22237, TISAX, "NIS2" or similar, **or** a supplier self-assessment every 3 years; high = certificate or on-site audit every 2 years | **yes** |
| Reinhausen | Supplier self-assessment V2, 07/2025 | asks for information-security certification (e.g. ISO 27001) | no |
| heyco | Supplier self-assessment on information security | information-security questionnaire | no |

Checked, no supplier security demand found: Vattenfall supplier code of conduct (2024-09), Orange
supplier code of conduct (2023), Bosch supplier quality requirements (only ISO 21434 for vehicle
cybersecurity). Siemens, Deutsche Telekom and Airbus pages that mention NIS2 sell NIS2 services; they
are not buyer demands. E.ON, Enel and Deutsche Bahn supplier portals surfaced but were not read. TIB Chemicals' self-disclosure has no security section beyond change notice.

Infrastructure for buyers (a demand signal, not a buyer): in the Netherlands, Nevi (6,500
procurement professionals) with MKB-Nederland and VNO-NCW (Samen Digitaal Veilig) published a model
**NIS2 addendum to purchase terms** (v2, 2025-02-07), and ABN AMRO tells business clients to add NIS2
clauses. That makes the demand repeatable at scale — any buyer can paste it in.

Size of the pool (Germany, BSI "NIS-2 in Zahlen", read 2026-10-04): BSI estimates ~29,500 entities
in scope; 17,945 registered, of which 6,215 especially important. Each must secure its direct
suppliers (NIS2 Art. 21(2)(d), §30 BSIG). This is an upper bound on buyers, not a count of buyers
who have sent anything.

Not found: a tender that requires NIS2 evidence from bidders (only vendor blogs claim it); any
survey giving the share of buyers that send supplier questionnaires (Cybersmart's 670-leader survey
says only 16% are confident they comply and that "customers are already asking for proof", with no
number). Jobs: Glassdoor lists 66 third-party-risk-manager jobs in Germany (not filtered for NIS2);
one StepStone post (CREALOGIX, a supplier) asks for experience with customers' contractual security
requirements and NIS2 — a supplier hiring to answer buyers, one source.

Kill-reason candidate (to weigh, not decided): buyers accept existing certificates (ISO 27001,
TISAX) or their own free self-assessment form. A small supplier without a certificate may just fill
in the form, which costs time but no money. The paid-today test is still open on the supplier side.

### NIS2 supplier-side paid-today test (2026-10-04)

Plain version: people are clearly **selling** help to answer a big customer's security
questionnaire — from 2,990 EUR fixed (Wermescher, Germany) down to $40 on Fiverr, and a free
government-funded tool (FitNIS2). What I could not find is one named small supplier who **paid**.
A price on a seller's page is not a sale. So the paid-today test is **not passed**: money moving is
unproven. And the price floor is close to zero, which is the same pattern as every earlier
candidate — real pain, cheap or free fixes already there.

Precise version. Offers aimed at a supplier answering a customer's evidence request:

| Seller | Offer | Price | Source checked |
|---|---|---|---|
| Wermescher Advisory (DE) | "IT-Sicherheitsnachweis für Großkunden": answers the questionnaire, evidence pack, measures plan, 1–2 days | 2,990 EUR fixed + VAT | page read |
| GreenOnion (AT) | supplier evidence package, 3 weeks | 1,900–3,900 EUR fixed | page read (also #59) |
| fraghugo (DE) | "Sicherheitsprofil": one public security profile + help with each questionnaire | included in a data-protection-officer plan from 79 €/month | page read |
| NIS2 Pilot (app) | supplier check, templates and PDF reports for customer requests | 9.99 € or 49.99 € one-time | page read |
| Fiverr sellers (4) | complete vendor security questionnaires (SIG Lite, CAIQ, custom) | $40, $40, $100, $200 | search snippets only; Fiverr returns 403, order counts not seen |

Signals someone wanted to pay, unverified: an Upwork job titled "Security Questionnaire Completion"
(posted by a client; budget not visible, 403). Content written for suppliers without a price: H5M,
octoja, TTG, biteno, audatis, nis2-service.

Counter-evidence, found with equal effort:
- **FitNIS2 Navigator** adds a supply-chain check and documentation module for SMEs, **free**, funded
  by the German economy ministry (BMWE) under "IT-Sicherheit in der Wirtschaft".
- Buyers offer their own free self-assessment forms (Baumann, Reinhausen, heyco — see above).
- Free supplier-questionnaire templates (norppa, Orbiq, CompliantDesk).
- Reddit r/cybersecurity: some suppliers do the reverse and **charge the customer** a consultant day
  to fill a questionnaire, pointing them to a trust page instead.

Verdict: demand from buyers is real but weak (above); money moving on the supplier side is
unproven; the price ladder runs 2,990 EUR → 79 €/month bundle → $40 → free. Desk research has hit
its limit — the next evidence has to come from suppliers themselves.

**Owner decision (2026-10-04): NIS2 is parked.** Reason: free and near-free fixes exist and no
small supplier was found paying. No more NIS2 runs unless new evidence of payment turns up. The
owner reviews the inbox next.

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
Continue oppie.lab: check NIS2 demand from the buyer side — are large EU companies actually sending NIS2 questionnaires to small suppliers, and how many?
```
