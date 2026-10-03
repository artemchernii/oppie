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
- The analysis result is proposal-shaped. It is never written into a record by running.
- An analysis reports **how many dimensions are unknown** and which dimension blocks the record.
  It never reports an aggregate.
- **Explicitly not changed:** `docs/RULES.md` § 5 and `AGENTS.md` § 6. There is no overall score,
  no weighted total and no index, and this capability is what makes that rule structural rather
  than a promise — see the decision on verdict vocabulary below.
- Not in this change: more sources for the collector, the new board, charts, or wiring the
  collector to Supabase. Those are separate changes.

## Capabilities

### New Capabilities

- `problem-analysis` — evaluating one problem record against the method's dimensions and returning
  citable per-dimension verdicts.

### Modified Capabilities

None. `openspec/specs/` is empty; this is the first capability, so there are no existing
requirements to change.

## Decisions

**The verdict vocabulary is `yes` / `no` / `unknown`, not `0–3`.** The readiness tally already uses
`0–3` per question, and reusing it here would be the cheaper choice. It is rejected because a
`0–3` rubric is summable: someone will add it up, in the UI or in a spreadsheet, and the sum will be
presented as a score. `yes` / `no` / `unknown` cannot be summed into anything, which makes the
no-composite rule a property of the data rather than a rule someone has to remember. The cost is a
second scale in the product, next to the tally's `0–3`, and that cost is accepted and should be
stated wherever both appear.

**The analysis takes a problem record plus its collected sources, and returns verdicts. It does not
write.** The writing path already exists and already has its guard: a proposal is accepted by a
person, and acceptance writes the value, the reason and the source together.

## Impact

- A new React-free module under `lib/` so the rubric rules can be exercised in `pnpm test`, in the
  shape `lib/problemSync.ts` established.
- A new read-only surface showing the analysis next to the record. No existing screen changes
  meaning, and no stored field is added.
- `docs/RULES.md` § 1, § 2, § 3, § 4, § 5, § 11 and `docs/PAIN_FUNNEL.md` § Ordering become the
  cited sources for requirements rather than prose that only a person reads.
- `AGENTS.md` § 6 and `DECISIONS.md` #1 are not overridden. This change is the first that makes the
  no-composite invariant checkable in code instead of by review.
