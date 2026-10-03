# Tasks

## 1. The rubric as a pure function

- [x] 1.1 Add `lib/analysis.ts` with the seven dimensions of the rubric, each carrying its key, its label, and the `docs/` rule it derives from. Verify with `pnpm exec tsc --noEmit`, and by checking the module imports nothing outside `lib/problems.ts` — no Supabase, no React, no clock.
- [x] 1.2 Implement the per-dimension verdict: `yes` / `no` / `unknown`, each carrying either a `{ field }` or a `{ sourceUrl, passage }` citation, or nothing. Verify with assertions in `scripts/analysis.test.js` that a record with no evidence and no signals returns seven `unknown` verdicts and never a `no`.
- [x] 1.3 Implement the score from verdicts and the exported `WEIGHTS`, returning `score`, `computedOver`, `unknown[]` and `blocking`. Verify with assertions that (a) five answered dimensions report `checked 5 of 7`, (b) a checked `0` contributes `−1` while an `unknown` contributes nothing and shrinks the base, and (c) a record with every dimension unknown produces no score rather than `0`.
- [x] 1.4 Give each dimension a `rule` reference and export `RUBRIC_VERSION`. Verify with an assertion that every dimension names a rule, and that changing `RUBRIC_VERSION` is the only way a score's provenance can change.
- [x] 1.5 Add `lib/analysis.ts` to the `tsc` file list in `package.json` so `pnpm test` exercises it, with its own suite rather than appended to the problems suite. Verify: `pnpm test` runs five suites and the analysis one passes.
- [x] 1.6 Point `docs/PAIN_FUNNEL.md` § Where a score sits at `docs/ENGINE.md` and at the spec as normative, rather than restating the seven dimensions in a third place.
- [x] 1.7 Document the two-way mapping the rubric depends on — that a signal answered `0` is where a `no` legitimately comes from, and that an empty field is `unknown` rather than a quieter `no`. Verify: the header of `lib/analysis.ts` states both, and two assertions fail if either is reversed.

## 2. Ratings at the storage boundary

- [ ] 2.1 Write `supabase/migrations/20261004000000_problem_ratings.sql`: the `problem_ratings` table from design.md § 4, its divergence CHECK, `enable row level security`, the allowlist policy and grants matching the nine existing tables. Verify the file is idempotent, then paste it into the dashboard and confirm `select conname from pg_constraint where conname = 'rating_reason_required_on_divergence'` returns one row.
- [ ] 2.2 Add a pure predicate for the divergence rule to `lib/analysis.ts` (given a rating and a score, is a reason required?). Verify with assertions at the threshold: exactly 3 apart needs no reason, 4 apart does.
- [ ] 2.3 Add the read and write for ratings to `lib/problemRemote.ts` as the signed-in person, following `saveRemoteProblem`: a read for a page and a write that refuses an empty reason where one is required. Verify with a live round trip, and by confirming a rating of 7 against a score of 0 with an empty reason is refused by the database as well as by the caller.
- [ ] 2.4 Expose the write as a server action beside `saveProblem` in `lib/problemActions.ts`. Verify with `pnpm exec tsc --noEmit` and by calling it from the detail surface in group 3.

## 3. The detail surface

- [ ] 3.1 Render the seven verdicts with their citations, each linking to its source where there is one. Verify live: a record with no evidence shows seven unknowns and no citation, and one with evidence shows the URL.
- [ ] 3.2 Render the score with its per-dimension contributions, its scale, its "computed over N of 7", and its count of unknowns, labelled as this system's judgement. Verify live that no surface shows the number without the breakdown reachable from it.
- [ ] 3.3 Add the blind rating control: 0–10, with the reason field appearing only when the rating diverges by more than 3. Verify live that submitting a reason is not possible when it is not required, and is required when it is.
- [ ] 3.4 Withhold the score on this surface until a rating exists for the current `RUBRIC_VERSION`, then reveal it. Verify live by reloading before and after rating.
- [ ] 3.5 Record the rubric version and the score-at-rating on submission. Verify by reading the row back from the database after a rating.

## 4. The list surface

- [ ] 4.1 Show the score only for records rated under the current rubric version, and `not rated yet` otherwise. Verify live that a freshly loaded list shows no scores.
- [ ] 4.2 Keep the cited ordering as the default and add sorting by score, labelled as this system's judgement rather than as a cited fact. Verify live that the label is present in both states and that the default is unchanged from before this change.
- [ ] 4.3 Add the unanalysed lane, derived from the record as in design.md § 6, with its count stated next to the ordering control. Verify live that records with no answered dimension appear in the lane and cannot be sorted out of reach.

## 5. Integration

- [ ] 5.1 End to end on the live database: edit a problem, rate it blind, reload, and confirm the rating, the rubric version and the score-at-rating all persisted, and that the score is now revealed.
- [ ] 5.2 Confirm no path exists that writes a verdict or a score into a problem record without an acceptance carrying a reason — check the server action surface and grep for writes to `problems` outside `saveRemoteProblem`. Verify with `rg "from\(\"problems\"\)" lib/`.
- [ ] 5.3 Archive the change with `openspec archive problem-analysis-rubric`, which moves the capability into `openspec/specs/problem-analysis/`. Verify with `openspec list --specs` showing the capability and `openspec validate` passing.
