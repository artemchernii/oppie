# Handoff — the analysis surfaces

Written 2026-10-04, at the end of the session that built the ratings table. Read alongside
`AGENTS.md` (rules for changing anything), `openspec/changes/problem-analysis-rubric/` (proposal,
design, tasks and spec — normative), and
`openspec/changes/readable-interface/specs/reading-paths/spec.md` (normative for the screens this
handoff is mostly about).

> **Read this file, not `STATUS.md`.** `STATUS.md` is 16 commits behind `master` and wrong in three
> places, listed at the bottom. `docs/handoffs/HANDOFF_SUPABASE.md` is the history of the storage
> slice; it self-flags at the top as superseded, and its "traps" section is still worth reading.

## Where things stand

**Plain.** The app is a research board for business problems. Everything *behind* the screen is
ahead of the screen: the records live in the database and editing them works, and there is now a
rubric that scores a record, names the dimension blocking it, and stores your own rating beside it —
and no page renders any of that. The list on `/` shows an id, a title, one line of prose, a role, a
gate chip and a readiness number like `12/15`. The score, the seven verdicts, the citations and the
blocking dimension exist in `lib/analysis.ts` and reach nothing. That gap is why the owner's own
words — *"everything is bland and confusing. Not helpful."* — are the opening line of the
`readable-interface` proposal, and it is the thing groups 3 and 4 fix.

**Precise.** `master` is `a9b9d10`. The work is on **`feat/problem-ratings-table`**, three commits,
**not pushed**, nothing uncommitted:

| Commit | What |
|---|---|
| `6a0d7f3` | `feat(ratings)`: the migration, the type, the row mapping, the read, the write, the server action |
| `a1a18ea` | `docs(rubric)`: tick 2.3, verified against the live table |
| `1e6fd70` | `docs(rubric)`: tick 2.1, the migration is applied |

`openspec list` reports `problem-analysis-rubric 10/22 tasks`. `openspec/specs/` is **empty** — no
capability is captured yet, and the first one lands when 5.3 archives this change.

## What this branch did — group 2, ratings at the storage boundary

- **`supabase/migrations/20261004000000_problem_ratings.sql`** — applied in the dashboard. One new
  table, no column added to any existing table, so dropping it rolls the increment back. The
  divergence CHECK is `rating_reason_required_on_divergence`; the threshold in SQL is a copy of
  `DIVERGENCE_THRESHOLD` in `lib/analysis.ts` (see Traps).
- **`lib/problems.ts`** — `ProblemRating`, the stored record.
- **`lib/problemSync.ts`** — `ratingRowFrom` / `ratingFromRow` / `NewRating`, the row mapping, both
  directions, React-free and covered by `pnpm test`. A row that cannot be read as a rating is
  **dropped, not repaired**; so is a divergent row with a blank reason.
- **`lib/problemRemote.ts`** — `readRemoteRatings` (every rating, oldest first, because the
  divergence log is the point), `ratingsForPage`, `saveRemoteRating({ problemId, rating, reason })`.
- **`lib/problemActions.ts`** — `rateProblem`, the `"use server"` gate beside `saveProblem`.

### Three decisions in this branch that must not be quietly reversed

1. **`answered_at_rating` is stored with `score_at_rating`** — one column beyond design.md § 4. A
   score is a proportion over the dimensions that were answered, so a stored score without its base
   is a number whose inputs cannot be recovered, which `docs/RULES.md` § 5 forbids and
   `reading-paths` forbids showing. `check (between 1 and 7)` also makes an unanalysed record
   unratable **in the database**, not only in the caller.
2. **The score and the rubric version are derived server-side**, from the record plus
   `lib/analysis.ts`, never accepted from the browser. A stored row claims to be what the system
   said, so the system has to be the one that said it.
3. **`reason = ''` means "the rating agreed, so no reason was asked for."** It is a decided value,
   not a missing one: the surface must say *no reason needed* and never *Not added yet*, a blank, or
   a dash.

Both the base column and the score derivation are data-model/visible-number decisions — per
`AGENTS.md` § 7 they belong in the PR body under a **Decisions** heading.

### What was verified live, and how

- The constraint exists: `select conname from pg_constraint where conname =
  'rating_reason_required_on_divergence'` returned one row.
- The database refuses rather than warns: an insert of `rating 7` against `score_at_rating 0` with
  `reason ''` came back **`23514`**, naming the constraint. The same insert with the numbers
  agreeing was accepted.
- The mapping round-trips against the real schema: a row built by `ratingRowFrom` and read back by
  `ratingFromRow` came back field-for-field identical, with `created_at` stamped by the database
  (`2026-10-03T15:01:45.909Z`). The probe row was then deleted; `problem_ratings` holds **0 rows**.
- `pnpm test`: **5 suites, 100 assertions, 0 failed** (problems 41, analysis 23, companies 12,
  research 17, supabase 7). `pnpm exec tsc --noEmit` and `pnpm build` clean. `openspec validate
  problem-analysis-rubric` valid.

**Not yet exercised:** the `authenticated` path — the policy and the grant block only matter to a
signed-in write, and nothing has written a rating from the browser yet. If that block had not run,
the failure would be `42501` on the write, not a silent no-op. Group 3's rating control is what
proves it; task 5.2's `rg` check is the other half.

## Next, in order

Everything below is unchecked in `openspec/changes/problem-analysis-rubric/tasks.md`. Work it in
that order; the numbers are stable.

1. **Finish 2.4** by rendering, not by testing: `rateProblem` compiles, its stated proof is being
   called from the detail surface.
2. **Group 3 — the detail surface** (`app/ProblemDetail.tsx`, fed by `app/problems/[id]/page.tsx`):
   the seven verdicts with citations (3.1); the score with its per-dimension contributions, its
   scale, its *computed over N of 7* and its unknown count, labelled as this system's judgement
   (3.2); the blind rating control, reason field appearing only past the threshold (3.3); the score
   withheld until a rating exists for the current `RUBRIC_VERSION`, then revealed (3.4); and the
   version plus score-at-rating recorded on submission (3.5 — already free, `saveRemoteRating` does
   it; verify by reading the row back).
3. **Group 4 — the list surface** (`app/ProblemsList.tsx`): score only for records rated under the
   current rubric version, `not rated yet` otherwise (4.1); the cited ordering stays the default and
   a score sort is added, labelled as this system's judgement (4.2); the unanalysed lane with its
   count beside the ordering control (4.3).
4. **Group 5 — integration**: end to end on the live database (5.1); prove no path writes a verdict
   or a score into a problem record without an accepted reason, `rg 'from\("problems"\)' lib/`
   (5.2); then `openspec archive problem-analysis-rubric` to capture the capability into
   `openspec/specs/problem-analysis/` (5.3).

The surface currently reads through `problemsForPage()`; `ratingsForPage()` exists and has no caller
yet — that is deliberate, and wiring it is group 3's first move.

## The rules that constrain those screens

`openspec/changes/problem-analysis-rubric/specs/problem-analysis/spec.md` is normative for the
analysis, and these are the parts a screen can break by accident:

- A score is never shown without its inputs: the per-dimension contributions and the citation behind
  each verdict must be reachable **from the number**, and the number says how many dimensions it was
  computed over. A score without its base is a defect, not a simplification.
- An unknown is never summed as a zero, and a checked answer is never reported as `unknown`.
- Every verdict carries what decided it, and a verdict resting on a snippet says the page was not
  opened.
- Ordering by score says, on the surface, that it is this system's judgement and not a cited fact.

`openspec/changes/readable-interface/specs/reading-paths/spec.md` is normative for the interface,
and it is the spec the last several sessions of interface work were written against. Its seven
requirements: the three reading paths in order (list → why a problem is good or bad → who is already
there, one link each, and a fact with no way back to its record is a defect); **the judgement appears
on the row, not behind a click** (score, base and the blocking dimension named in words); the order
is stated and can be changed; **colour carries a meaning and is never the only carrier**; **a number
on screen is a count of records or a figure quoted verbatim** — nothing whose length came from a
weighting, an average or a percentage; **an empty field is visibly empty** (*Not added yet*, never
blank, never a dash, and a checked `0` renders as `0`); and the list names each record's next test or
next question, or says it has neither.

That last pair is where the two specs meet, and it is already settled at the storage boundary:
`reason = ''` means *no reason needed*, and a missing field means *Not added yet*. They are two
different sentences and the surface must not collapse them.

## Facts worth not rediscovering

- **The live database is inspectable from a node one-liner** with the secret key, read-only, without
  `psql`. `.env.local` holds `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`;
  `scripts/load-companies.js` has the env-parsing pattern to copy. As of today: `allowed_users` holds
  exactly the one owner row (**the allowlist is applied and live**), `problems` 10 rows,
  `problem_evidence` 10, `companies` 21, and `problem_ratings`, `proposals`, `collected_sources` and
  `opportunities` all **0**.
- The publishable key with no session must fail with **`42501 permission denied`**, not return an
  empty list. The `revoke` from `anon` is what makes that difference, and an empty list means the
  revoke was lost.
- `pnpm test` compiles `lib/` into `.tmp-test/` with `tsc`, then runs the five assertion suites in
  plain Node. It does **not** touch `.next`, so it is safe with the dev server running. A one-liner
  that needs compiled `lib/` code (as the live probes do) must run `pnpm test` first.
- There is no `psql`, `supabase` CLI or docker on this machine. **The dashboard SQL editor is the
  only way to run DDL**, and every migration in `supabase/migrations/` is written to be re-runnable
  there.
- The dev server is currently **running, detached**, with its log at `/tmp/oppie-dev.log`. It was
  started detached, so stopping it does not disturb anybody's terminal.
- `openspec/changes/archive/` is empty and `openspec/specs/` is empty: nothing has been archived
  yet, so 5.3 will be the first archive and the first captured capability.

## Traps that have already cost time

- **`pnpm build` while `pnpm dev` is running breaks the dev server, and the symptom is not the one
  the docs predict.** `STATUS.md` predicts `500` and `MODULE_NOT_FOUND`; what actually happened is a
  page that renders fine and is **completely unstyled**, because the served HTML links
  `/_next/static/css/app/layout.css?v=…` and that URL returns Next's 404 page. Diagnosis in one
  line: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/<the css href>`. Fix: stop the
  dev server, `rm -rf .next`, `pnpm dev`, then **hard-reload the browser** — the 404 is cached. The
  durable fix is to give builds their own output directory (`distDir: process.env.NEXT_DIST_DIR ??
  ".next"`), which is proposed and not applied.
- **The divergence threshold lives in two places and SQL cannot import it.** `3` in the migration's
  CHECK and `DIVERGENCE_THRESHOLD` in `lib/analysis.ts`. If the constant moves, a follow-up migration
  must drop and re-add the constraint, or the app and the database will disagree about when a reason
  is owed.
- **The score is a proportion, so completeness sorts first.** `compareByScore` puts dimensions
  answered above the score, and it is not a tie-break: P-002 with two of seven checked scored 10/10,
  the same as P-001 with six of seven checked and one known hole. Sorting by the number alone puts
  the least examined record on top. Do not "simplify" this.
- **`problem_signals` and `problem_companies` have composite primary keys and no `id` column.** A
  PostgREST probe of the form `select("id", { count: "exact", head: true })` returns an undefined
  count for them rather than an error, so a table "checked" that way has not been checked. Count them
  with a normal select.
- **Inside the context-mode sandbox `rg` is not on the PATH**, though `grep` is. The repo's habit is
  ripgrep; in a sandboxed command, use `grep`.

## Accepted, do not "fix"

- **The blind reveal is unenforced** (design § 5). A person can peek at the score. Accepted: it is an
  anti-anchoring discipline, not a trust boundary, and there is exactly one user. Enforcing it costs
  a server-side filter and a second source of truth about what has been seen.
- **Ratings are append-only in the app, but `update` and `delete` are granted** on the table, to
  match the other nine and to let a mistyped row be fixed by hand in the dashboard.
- **Weights are hand-written and all equal.** A fitted weight is a separate change and arrives as a
  new `RUBRIC_VERSION`, never as an edit to the current one.
- **`problem_ratings` has no `unique (problem_id, rubric_version)`.** A second rating under the same
  rubric is a person changing their mind, and the last one is the current one.

## Still open

- `STATUS.md` is 16 commits stale. Three concrete corrections: it says the allowlist has not been
  applied (**it has**), it describes `lib/auth.ts` (deleted in #22), and it claims 81 assertions
  across four suites (**100 across five**). It also still describes the browser as a store, which
  `DECISIONS.md` #9 deleted.
- From `DECISIONS.md` #1: what attachments are; multi-device conflicts; whether the research
  collector moves server-side; whether the legacy opportunity board is migrated into problem records
  or retired; whether `companies` becomes writable rather than seed-only.
- Two spec-only changes are waiting behind this one and neither has a `tasks.md` yet:
  `readable-interface` (the reading paths — its spec is already the constraint on groups 3 and 4) and
  `company-records` (the companies screen: country, currency, pricing basis, and the competitor
  prices that currently make the rubric's `competition` dimension `unknown` on almost every record).
- The rating control's shape is still a choice: 0–10 as a slider or as a number input. Task 3.3 only
  fixes the range and the threshold.

## Writing rules for whoever reads this next

- **Two registers, plain first** (`AGENTS.md` § 9). The owner wrote this method and still wants the
  plain version at the end of a long day. Simplify the telling, never the numbers.
- **Replies keep the emoji summary block** — asked and confirmed; one per line, nothing after it.
- Nothing lands on `master` directly: branch, `pnpm test` and `pnpm build` locally, push, PR with a
  Conventional Commit title. The PR body needs a **Decisions** heading for the two decisions above.
