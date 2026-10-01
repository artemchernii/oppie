# DeepSeek handoff — pain funnel and problem list

## Objective

Change the oppie.lab MVP from an opportunity board into a pain-first research funnel.

Read first:

- `docs/PAIN_FUNNEL.md`
- `docs/PROBLEM_LIST.md`
- `docs/MVP_SPEC.md`
- `docs/RULES.md`
- `docs/RESEARCH_CONTEXT.md`
- `AGENTS.md`

## Product change

The main object is now a `Problem`, not an `Opportunity`.

A problem is tracked on three separate axes. One ladder conflates them, so a problem cannot be
"repeated *and* being hand-run *and* parked" without losing one of the three facts.

```text
gate     G1-signal | G2-paid | G3-repeated | G4-buyer | G5-tested
action   idle | researching | interviewing | hand-running | building
verdict  open | parked | killed
```

The gates are defined in `docs/PAIN_FUNNEL.md` § Gates. Turn none of this into a score or a ranking:
ordering happens per `docs/PAIN_FUNNEL.md` § Ordering, and only for records that have passed every gate.

## UI requirements

### Funnel view

Add a compact funnel or horizontal stage view showing the number of problems at each gate.

Numbers here are counts of records only, not quality scores. Each gate shows how many records have
passed it and how many are blocked on it.

Clicking a stage filters the problem list.

### Problem list

Add a readable table/card list seeded from `docs/PROBLEM_LIST.md`:

- problem title
- affected role / buyer
- current workaround
- gate
- pays today (G2) — shown as `Not added yet` when unchecked
- next question or next test
- evidence count

Sort by the ordering rule in `docs/PAIN_FUNNEL.md`, never by a score column.

Use search and filters. Keep the page scannable.

### Problem detail

Add a detail drawer or panel with editable fields:

- problem statement
- domain
- affected role
- buyer
- current workaround
- frequency
- business consequence
- why they might pay
- paid today — what is paid, roughly how much, and a link
- competition — count, names, price range, link
- moat — level 0–3, the advantage, and the path: `service` or `product`
- target segment — firms nameable, net price per month, customers needed
- skill fit
- evidence links and observations
- unknowns
- kill reason
- next test
- gate, action, and verdict

Evidence should be a small repeatable sub-record with type, observation, URL, date, and confidence.

### Existing data

Do not delete the six existing opportunity records. Keep them available as legacy seed data or a secondary “Opportunities” view. The new “Problems” funnel is the default view.

## Constraints

- No composite score, weighted total, or invented conclusion. Ordering by cited facts only, and
  only for records past every gate.
- `0` and blank are different: a checked zero renders `0`, an unchecked field renders `Not added yet`.
- Do not auto-generate demand claims.
- Keep evidence, unknowns, assumptions, and kill reasons separate.
- Empty fields must say `Not added yet`.
- Local persistence is sufficient for now.
- No auth, billing, backend, sync, crawler, or external AI integration.
- Preserve the current visual language unless a small change improves clarity.

## Acceptance criteria

- [ ] App opens on the Problems funnel.
- [ ] Ten initial problems are visible from `docs/PROBLEM_LIST.md`.
- [ ] Gate counts are visible and filter the list.
- [ ] Gate, action, and verdict are separate and independently editable.
- [ ] The paid-today field is present and its evidence is linkable.
- [ ] A problem can be opened and edited.
- [ ] Evidence can be added and linked.
- [ ] No composite score, weighted total, or rank column appears anywhere.
- [ ] An unchecked field renders `Not added yet`; a checked zero renders `0`.
- [ ] Gate, action, and verdict changes persist after refresh.
- [ ] A new problem can be added.
- [ ] Existing opportunity data remains accessible.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] No generated output is committed.

## Workflow

Create a branch from up-to-date `master`:

```bash
git switch master
git pull --ff-only
git switch -c feat/pain-funnel
```

Use Conventional Commits. Before opening a PR:

```bash
pnpm test
pnpm build
```

Open a PR against `master`. Do not push directly to `master`. Use squash merge only.

## Return format

Report:

1. Files changed.
2. What works.
3. What remains deliberately unbuilt.
4. Test and build results.
5. Any product decision that needs Artem's review.
