# DeepSeek handoff — pain funnel and problem list

## Objective

Change the oppie.lab MVP from an opportunity board into a pain-first research funnel.

Read first:

- `PAIN_FUNNEL.md`
- `PROBLEM_LIST.md`
- `MVP_SPEC.md`
- `RULES.md`
- `RESEARCH_CONTEXT.md`
- `AGENTS.md`

## Product change

The main object is now a `Problem`, not an `Opportunity`.

The app should let the user move problems through these states:

```text
new → evidence → repeated → buyer-known → testing → build
                                  ↘ killed / parked
```

Do not turn states into scores or rankings.

## UI requirements

### Funnel view

Add a compact funnel or horizontal stage view showing the number of problems in each state.

Numbers here are counts of records only, not quality scores.

Clicking a stage filters the problem list.

### Problem list

Add a readable table/card list seeded from `PROBLEM_LIST.md`:

- problem title
- affected role / buyer
- current workaround
- state
- next question or next test
- evidence count

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
- skill fit
- evidence links and observations
- unknowns
- kill reason
- next test
- state

Evidence should be a small repeatable sub-record with type, observation, URL, date, and confidence.

### Existing data

Do not delete the six existing opportunity records. Keep them available as legacy seed data or a secondary “Opportunities” view. The new “Problems” funnel is the default view.

## Constraints

- No overall score, ranking, or invented conclusion.
- Do not auto-generate demand claims.
- Keep evidence, unknowns, assumptions, and kill reasons separate.
- Empty fields must say `Not added yet`.
- Local persistence is sufficient for now.
- No auth, billing, backend, sync, crawler, or external AI integration.
- Preserve the current visual language unless a small change improves clarity.

## Acceptance criteria

- [ ] App opens on the Problems funnel.
- [ ] Ten initial problems are visible from `PROBLEM_LIST.md`.
- [ ] Stage counts are visible and filter the list.
- [ ] A problem can be opened and edited.
- [ ] Evidence can be added and linked.
- [ ] State changes persist after refresh.
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
