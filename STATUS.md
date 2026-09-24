# oppie.lab — current state and next steps

Last updated: 2026-09-25 · master `655cd3c`

## Where it is

A working, local-only MVP: an evidence-first opportunity research board that turns business
research into compact, comparable decision objects instead of long reports. Records are editable
and persist in the browser. There is no backend, account, or sync.

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

## Not built yet

- Deleting or archiving an opportunity.
- Any browser-level automated test. Click → edit → reload is verified at the logic and SSR
  layers only, so the one interaction that matters most is still checked by hand.
- `master` has not been renamed to `main`, and two commits predate the commit standard
  (`40e266b baseline: …`, `c0380b6 Merge pull request #1 …`).

## Checks

| Command | Covers |
|---|---|
| `pnpm test` | 16 assertions on the storage rules: recovery from corrupt JSON, stale schema, partial and malformed records, quota failure, id collisions, seed immutability |
| `pnpm build` | Production build, includes typechecking |

CI runs both on every pull request (`build`) and validates Conventional Commits on the PR title
and every commit in the branch (`commits`). A local `commit-msg` hook catches messages earlier,
and `pre-push` refuses a direct push to `master`. On the server, a ruleset requires a pull request
and green checks with no bypass actors, allows squash merges only, and blocks force pushes and
deletion.

## Next steps

1. **Test the MVP by hand**: open an opportunity → edit a field → save → reload → confirm the
   change survived → add a new opportunity.
2. **Then pick one**: works → define the next improvement; broken → fix that first; confusing →
   simplify the UI before adding features.
3. **Likely next slice**: delete or archive an opportunity, then source-confidence editing.
4. **Decisions still open**: confirm the inferred seed `stage` values (five `investigate`, one
   `discovery`), and whether `statusNote` earns its place as an eleventh field.

## Important files

- `MVP_SPEC.md` — product scope and acceptance criteria
- `RULES.md` — research methodology
- `RESEARCH_CONTEXT.md` — lessons from the Business Idea Session
- `AGENTS.md` — branch, commit, review, and product-invariant rules
- `HANDOFF_EDITING_PERSISTENCE.md` — completed implementation handoff
