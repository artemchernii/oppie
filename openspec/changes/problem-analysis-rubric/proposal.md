## Why

The app asks a person to do the analysis. Nothing evaluates a record against the method, so the five
gates and the paid-today test are enforced only by discipline, and the one rule that is cheapest to
check mechanically — "nothing claims to be read at source unless its link actually opened" — is
checked by a test on the seed data rather than on the user's records.

The existing pipeline suggests a value for one of the five readiness questions at a time. That is
narrower than the method: it never reports whether a record holds up against *each* dimension, and
it never says which dimension is the one blocking the record.

## What Changes

- **New capability: `problem-analysis`.** A rubric that evaluates a problem record against seven
  dimensions drawn from `docs/RULES.md`, returning one verdict per dimension, each carrying the
  record field or source that decided it.
- **A score, and a rank.** The verdicts are combined into a score using weights stated in the system
  and visible next to the number. The board can be ordered by it. This reverses an earlier draft of
  this change that banned scores outright — see `DECISIONS.md` #3.
- **A rating loop.** A person's own rating is stored beside the system's score, with the rubric
  version that produced it. A reason is required only where the two diverge by more than a threshold,
  because the divergences are the labels worth having.
- The analysis result is proposal-shaped. It is never written into a record by running.
- An analysis reports **how many dimensions it was computed over** and which dimension blocks the
  record. An unknown dimension never counts as zero.
- **`docs/RULES.md` § 5 is amended** by this change. The old text banned an overall score outright;
  the new text bans a number that hides its inputs, or that dresses itself up as a measurement. A
  score with stated dimensions, stated weights, reachable citations and a visible count of unknowns is
  allowed. `AGENTS.md` § 6, `docs/MVP_SPEC.md` and `openspec/config.yaml` move with it.
- Unchanged: `docs/RULES.md` § 12. The engine suggests; a person decides. Nothing is applied on load,
  on ingest or on a schedule.
- Not in this change: more sources for the collector, the new board, or charts. Separate changes.

## Capabilities

### New Capabilities

- `problem-analysis` — evaluating one problem record against the method's dimensions and returning
  citable per-dimension verdicts.

### Modified Capabilities

None. `openspec/specs/` is empty; this is the first capability, so there are no existing
requirements to change.

## Decisions

**Scores are allowed; hidden numbers are not.** An earlier draft of this change refused to produce a
score at all, on the grounds that a blended number is unfalsifiable. That was the wrong target. The
problem was never the arithmetic, it was a number with no visible provenance — and forbidding the
score does not answer "how do I rank it", it just declines to. The four conditions in
`docs/RULES.md` § 5 are what make a score checkable: stated dimensions, stated weights, reachable
citations, and a stated count of the dimensions it was computed over.

**The verdict vocabulary stays `yes` / `no` / `unknown`, and the score is separate from it.** The score
is a number; the verdicts are not. Keeping them apart means the number can be recomputed from
verdicts and weights at any time, and that a dimension which is unknown is visibly missing from the
sum rather than silently contributing a zero or a midpoint.

**A reason is required only on divergence.** The cost of a label is what decides whether labels ever
get made. Requiring a reason for every rating of every problem would make the loop too expensive to
run, and the ratings that agree with the system are the least informative ones anyway. Asking for a
reason exactly where the person and the system disagree captures the useful labels and costs almost
nothing.

**Weights are hand-written and visible, not fitted.** With one user and a handful of records there is
no training signal, and a weight fitted to ten labels is worse than a stated one because it looks
earned. The loop's output at this scale is a disagreement log to correct the rubric with, and only
later a training set.

**The analysis takes a problem record plus its collected sources, and returns verdicts and a score. It
does not write.** The writing path already exists and already has its guard: a proposal is accepted by
a person, and acceptance writes the value, the reason and the source together.

## Impact

- A new React-free module under `lib/` so the rubric rules can be exercised in `pnpm test`, in the
  shape `lib/problemSync.ts` established.
- A new read-only surface showing the analysis next to the record. No existing screen changes
  meaning, and no stored field is added.
- `docs/RULES.md` § 1, § 2, § 3, § 4, § 5, § 11 and `docs/PAIN_FUNNEL.md` § Ordering become the
  cited sources for requirements rather than prose that only a person reads.
- `AGENTS.md` § 6, `docs/MVP_SPEC.md` and `openspec/config.yaml` are amended in the same PR, because a
  rule that contradicts a decision is how the two drift apart.
- No stored field changes and no existing screen changes meaning. The score is computed, never stored
  on the problem; only an accepted rating is stored, and it carries the rubric version.
