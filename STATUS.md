# oppie.lab — current state and next steps

> **Read `docs/handoffs/HANDOFF_ANALYSIS_SURFACES.md` instead for anything current.** This file is
> 16 commits behind `master` and wrong in four places: the allowlist migration **has** been applied
> and is live; `lib/auth.ts` no longer exists (deleted in #22); `pnpm test` is 100 assertions across
> five suites, not 81 across four; and the browser is no longer a store (`DECISIONS.md` #9), so every
> paragraph about merging, cutover or a `localStorage` fallback describes how it used to work. The
> research next steps at the bottom are still the owner's own and are not covered by the handoff.

Last updated: 2026-10-03 · master `8cf977a`

## Where it is

An evidence-first opportunity research board that turns business research into compact, comparable
records instead of long reports. Records are editable. The **problem** records live in Supabase,
read and written as the signed-in person under a one-person allowlist; the opportunity board and
the research inbox still persist in the browser.

**The allowlist migration is merged but has not been run yet.** Until it is pasted into the
Supabase dashboard, the problems screen falls back to the seed plus whatever this browser holds.
`docs/handoffs/HANDOFF_SUPABASE.md` is current; the rest of this file lags on the auth and
Supabase work.

Runs at <http://localhost:3000> via `pnpm dev`.

## Done

- Six seeded candidates; card and table views; search and evidence-status filters.
- Detail drawer with the compact read mode as the default.
- Edit mode covering every field plus source rows (type, label, url, note, confidence).
- Add opportunity opens a blank form; new cards land on the board after saving.
- Edits survive a reload via `localStorage` (`oppie.lab.opportunities`), with reset-to-seed.
- Empty fields stay visible as "Not added yet". Nothing is scored or generated.
- Stage is tracked separately from evidence status.
- Specs and research rules are documented; repository workflow is enforced.
- Pain funnel designed: five gates, three axes (`gate` / `action` / `verdict`), the G2 paid-today
  test, and an ordering rule instead of a scoring rule.
- **G2 evidence collected for the reconciliation cluster.** The workflow is a paid job, a paid
  software category, and bespoke custom work. P-001, P-003 and P-006 now clear G2 — see
  `docs/PROBLEM_LIST.md` § G2 evidence. The sharpest finding: vendors bill data import separately, by
  effort, at up to tens of thousands, so messy statement ingestion is the part nobody has
  productised.
- **The Problems screen is built and is the default view.** Funnel by stage, ranked list, editable
detail, evidence rows, and a Companies & numbers tab.
- **Every problem has its own page** at `/problems/<id>`. Routes: `/` list ·
  `/problems/[id]` detail · `/companies` the numbers · `/opportunities` the legacy board.
- **Sign in with GitHub**, replacing the hand-rolled password gate. Middleware is the boundary, so
  a new screen cannot accidentally be an unguarded one.
- **The Supabase schema and the one-person allowlist.** Nine tables with RLS denying everything by
default, a `security definer` `public.is_allowed()` that a policy can call without being subject
to `allowed_users`' own RLS, and policies keyed to it.
- **The problems screen is off `localStorage`.** It reads as the signed-in person on the server —
so the first client render already has the records — and writes through a server action. The
browser's records are pushed up once and the seeds never are; `localStorage` stays as a cache.
- **Second research pass from new sources.** Public procurement documents (buyers stating the
  workflow as a contract requirement), the FCA CASS daily-reconciliation obligation, F2 Strategy's
  market survey (67% multi-custodian), and enterprise price points (Duco $80k/yr, ReconArt
  $300/user/month). 21 companies now carry a number. P-001 advanced to G3.

## Not built yet

- Nothing has been hand-run for a buyer, so no record has reached G5.
- Deleting or archiving a record.
- The legacy opportunity board is not migrated into problem records.
- Any browser-level automated test. Click → edit → reload is verified at the logic and SSR
  layers only, so the one interaction that matters most is still checked by hand.
- `master` has not been renamed to `main`, and two commits predate the commit standard
  (`40e266b baseline: …`, `c0380b6 Merge pull request #1 …`).

## Gotchas

- **Never run `pnpm build` while `pnpm dev` is running.** Both write to `.next/`, so the
  production build invalidates the dev server's chunk references and every page starts returning
  500 with `MODULE_NOT_FOUND`. Fix: stop the dev server, `rm -rf .next`, start it again.
- `pnpm dev` serves new routes immediately; `pnpm start` reads the build once at boot, so a route
  added after start returns 404 until the server restarts.

## Checks

| Command | Covers |
|---|---|
| `pnpm test` | 81 assertions across four suites: 16 on opportunity storage, 41 on problem records — the hydration contract, the first-load merge, what may be uploaded, checked-zero vs unchecked-blank, blank counting, ranking, signal and evidence repair, corrupt and stale records, id collisions, seed immutability — 17 on research, and 7 on the Supabase credential rules |
| `pnpm build` | Production build, includes typechecking |
| In the dashboard | The SQL in `supabase/migrations/` — there is no `psql` or `supabase` CLI on this machine |

CI runs both on every pull request (`build`) and validates Conventional Commits on the PR title
and every commit in the branch (`commits`). A local `commit-msg` hook catches messages earlier,
and `pre-push` refuses a direct push to `master`. On the server, a ruleset requires a pull request
and green checks with no bypass actors, allows squash merges only, and blocks force pushes and
deletion.

## Next steps

1. **Research the six backlog records** from the new source classes. Procurement documents and
   regulatory drivers proved far better than job boards; job boards only show that a role exists,
   while an RFP shows a buyer writing the requirement down.
2. **Message the freelance developer** who built the same tool for a solo RIA.
3. **Test the P-001 thesis**: is the middle real? A firm too big for a spreadsheet and far too small
   for an $80k Duco licence, handling European broker files.
4. **A research engine is the open question.** Collecting sources automatically is possible; drawing
   conclusions automatically is forbidden by `AGENTS.md` §6, so the engine would have to stop at
   gathering. Not built.
5. **Then** widen what the tool holds, not the screen around it.

## Decisions still open

- Whether `statusNote` earns its place as an eleventh field on `Opportunity`.
- Whether the legacy opportunity view is migrated into `Problem` records or retired.
- Whether the inferred seed `stage` values (five `investigate`, one `discovery`) are correct.

## Important files

- `AGENTS.md` — branch, commit, review, and product-invariant rules
- `DECISIONS.md` — decisions with a date, and what each one overrides
- `supabase/migrations/` — the schema and the allowlist, applied by pasting into the dashboard
- `docs/README.md` — index of the method, product and history docs
- `docs/PAIN_FUNNEL.md` — the gates, the ordering rule, and the problem record shape
- `docs/PROBLEM_LIST.md` — the research queue, plus the G2 evidence
- `docs/INTERVIEW_GUIDE.md` — who to talk to and what to ask
- `docs/MVP_SPEC.md` — product scope and acceptance criteria
- `docs/RULES.md` — research methodology
- `docs/handoffs/HANDOFF_PAIN_FUNNEL.md` — the funnel implementation brief
- `docs/RESEARCH_CONTEXT.md` — lessons from the Business Idea Session
- `docs/handoffs/HANDOFF_EDITING_PERSISTENCE.md` — completed implementation handoff

`docs/handoffs/HANDOFF_SUPABASE.md` is the current one. `HANDOFF_DEMAND_SEARCH.md` stays untracked
at the root on purpose: it holds personal detail and this repository is public.
