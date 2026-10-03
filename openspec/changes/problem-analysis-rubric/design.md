## Context

A `Problem` record already carries everything the rubric needs to read: the seven signals, the
evidence rows with their confidence and link status, the kill reason, the buyer, the competition
note. `lib/research.ts` already produces a *suggestion* for one of the five readiness questions with
its reason and its source, and `/inbox` is the only place it becomes a record. The database already
enforces that an accepted proposal carries both.

What does not exist is anything that reads a whole record against the method. The consequence today
is that the rules in `docs/RULES.md` are checked by a person remembering them, plus one test that
runs against the seed data rather than against the user's records.

See `proposal.md` — Why, and `DECISIONS.md` #3 for the reversal that allowed a score.

## Goals / Non-Goals

**Goals**

- The rubric is deterministic, pure, and testable with the harness the repo already has.
- The score can be recomputed from verdicts and weights at any time, by anyone, by hand.
- A rating produces a divergence log that is useful on the first record, not the hundredth.
- No new runtime, no new toolchain, no new service for this increment.

**Non-Goals (design-level boundaries, not scope restatements)**

- Extracting verdicts from sources. That needs a model and belongs to the engine, in Python.
- Fitting the weights. Ten ratings is not a training signal; see `DECISIONS.md` #3.
- Charts, the new board, or the companies screen.
- Any server-side enforcement of the blind reveal. It is an anti-anchoring discipline, not a trust
  boundary, and the app has exactly one user.

## Decisions

### 1. The rubric is a pure function in `lib/analysis.ts`, computed on read, never stored

`analyse(problem, rubric) -> { dimensions, score, computedOver, unknown, blocking }`. No I/O, no
database, no clock. Tested by `pnpm test` alongside `lib/problemSync.ts`.

*Alternatives considered:* computing it in the Python engine. Rejected for this increment because it
would make a pure function depend on a toolchain that does not exist yet, and because the surface has
to render "computed over 3 of 7" and the per-dimension contributions live — so the arithmetic ends up
in the app regardless. The engine's job is extraction, which is the part that genuinely needs Python.

*Consequence:* the analysis cannot go stale, because there is nothing to go stale. A verdict is a
statement about the record as it is now. There is no `problem_analyses` table and no re-run button.

### 2. Verdicts about sources arrive as proposals, through the path that already exists

The engine reads a source and proposes a verdict with its citation. That proposal is stored in
`proposals` and accepted by a person, exactly as a readiness suggestion is today. The rubric then
reads the accepted value from the record like any other field.

This is what keeps "nothing applies itself" true without inventing a second acceptance path, and it
is why no new analysis storage is needed.

### 3. Weights live in one versioned constant, stored as data

`RUBRIC_VERSION` and `WEIGHTS`, exported from `lib/analysis.ts`, naming a dimension and a number each.
An accepted rating records the version it was made against. Fitting, when it comes, writes a new
version; it never mutates the old one.

### 4. One new table: `problem_ratings`

```
problem_ratings (
  id                    text primary key,
  problem_id            text not null references problems(id) on delete cascade,
  rubric_version        integer not null,
  score_at_rating       smallint not null check (score_at_rating between 0 and 10),
  rating                smallint not null check (rating between 0 and 10),
  reason                text not null default '',
  created_at            timestamptz not null default now(),
  constraint rating_reason_required_on_divergence check (
    abs(rating - score_at_rating) <= 3 or btrim(reason) <> ''
  )
)
```

`score_at_rating` is stored rather than derived because the score is recomputed on read: after any
edit to the record it is a different number, and the divergence that prompted the reason would no
longer be reproducible. The divergence is a fact about a moment.

Both numbers sit on 0–10 so they can be compared at all. An earlier draft of this design stored the
signed sum and a rating on different scales, which would have made "do these disagree?" a comparison
of nothing; `docs/ENGINE.md` § v1 arithmetic maps the sum onto 0–10 instead.

The CHECK is the same shape as `proposal_acceptance_carries_its_reason`, and for the same reason: the
rule is worth holding in the database rather than trusting the caller, because a violation is silent.
The threshold is 3 points, the same constant as `DIVERGENCE_THRESHOLD` in `lib/analysis.ts`.

RLS: the allowlist policy, identical to the nine existing tables. The table is added to
`openspec/specs/` when the spec is captured.

### 5. The reveal is blind, and the list is where it actually matters

The score is withheld on every surface until a rating exists for the current `rubric_version`. On the
list, a rated record shows its score and an unrated one shows `not rated yet` — a list that shows
scores would break the blind reveal for every subsequent record, which is the whole discipline.

### 6. "Unanalysed" is derived, not stored

A record is unanalysed when no dimension has an answer and no evidence is attached. That is a
function of the record, so the lane needs no column and cannot disagree with the data.

## Risks / Trade-offs

- **[A recomputed score changes after a rating, so the rubric's history is only in the ratings
  table]** → `score_at_rating` and `rubric_version` are both stored, and nothing recomputes an old
  rating. An old rating is a statement about the problem under an old rubric, and is kept as such.
- **[Two scales in one product: the tally's 0–3 and the verdict's yes/no/unknown]** → the surface
  never shows them adjacent without labels, and the rubric never reuses a tally number as a verdict.
- **[A hand-set weight is wrong, and a wrong weight ranks the board wrongly]** → that is what the
  divergence log is for, and it is why the rating ships with the rubric rather than after it. Weights
  are one visible constant, changeable in a single commit, versioned.
- **[Blind reveal is unenforced, so it can be peeked at]** → accepted. The cost of enforcement is a
  server-side filter and a second source of truth about what the user has seen; the cost of peeking
  is a spoiled label, which the user can simply choose not to spoil.
- **[Deriving "unanalysed" from an empty record means a record with one answered dimension leaves the
  lane and can then sort last]** → the lane is not the only protection: the list states the count of
  unanalysed records next to the ordering control, so they cannot become invisible.

## Migration Plan

1. Add `problem_ratings` by pasting a new migration into the Supabase dashboard, as with
   `20261002000000_allowlist.sql`. Additive; the table starts empty.
2. Land `lib/analysis.ts` and its assertions. Nothing reads it yet, so behaviour is unchanged.
3. Wire the detail surface, then the list.
4. Rollback: drop the table. No column is added to any existing table, so no problem record can be
   affected by the rollback.

## Open Questions

None that change what gets built. Three left deliberately to implementation, each one constant or one
commit: the divergence threshold, the wording of the dimension labels, and whether the weights are
integers or halves. Fitting the weights is a separate change in Python, and it depends on ratings
existing — which is this change's output.
