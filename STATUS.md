# oppie.lab — current state and next steps

Last updated: 2026-10-01 · master `ce255e2`

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
- Pain funnel designed: five gates, three axes (`gate` / `action` / `verdict`), the G2 paid-today
  test, and an ordering rule instead of a scoring rule.

## Not built yet

- **The pain funnel itself.** The app still opens on the opportunity board; `Problem` is not a
  record type yet. See `HANDOFF_PAIN_FUNNEL.md`.
- No problem has cleared G2, so the ordering table in `PROBLEM_LIST.md` is deliberately empty.
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

1. **Twenty conversations, one week, €0, no code.** Behaviour questions only: how many accounts,
   when they last totalled them, what they used, where it broke. See `PAIN_FUNNEL.md` § The next
   action is not in this repo. Write the kill criterion before the first conversation.
2. **Fix the buyer on P-002 and P-004** — each names a retail investor or two buyers, and the
   company-buyer set requires exactly one. See `PROBLEM_LIST.md` § Buyer must be fixed.
3. **Find G2 evidence** — job postings are the highest-yield source, because the salary is the price
   already being paid. Until a record clears G2, nothing is ranked.
4. **Widen the signal set** — the ten problems are roughly four problems restated. The next pass
   should add raw signals from outside finance operations.
5. **Then, and only then**, build the funnel UI.

## Decisions still open

- Whether `statusNote` earns its place as an eleventh field on `Opportunity`.
- Whether the legacy opportunity view is migrated into `Problem` records or retired.
- Whether the inferred seed `stage` values (five `investigate`, one `discovery`) are correct.

## Important files

- `PAIN_FUNNEL.md` — the gates, the ordering rule, and the problem record shape
- `PROBLEM_LIST.md` — the current research queue
- `MVP_SPEC.md` — product scope and acceptance criteria
- `RULES.md` — research methodology
- `HANDOFF_PAIN_FUNNEL.md` — the pending funnel implementation brief
- `RESEARCH_CONTEXT.md` — lessons from the Business Idea Session
- `AGENTS.md` — branch, commit, review, and product-invariant rules
- `HANDOFF_EDITING_PERSISTENCE.md` — completed implementation handoff
