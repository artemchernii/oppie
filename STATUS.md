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
- **G2 evidence collected for the reconciliation cluster.** The workflow is a paid job, a paid
  software category, and bespoke custom work. P-001, P-003 and P-006 now clear G2 — see
  `PROBLEM_LIST.md` § G2 evidence. The sharpest finding: vendors bill data import separately, by
  effort, at up to tens of thousands, so messy statement ingestion is the part nobody has
  productised.
- **The Problems screen is built and is the default view.** Funnel by stage, ranked list, editable
detail, evidence rows, and a Companies & numbers tab. Stored under `oppie.lab.problems`.

## Not built yet

- Nothing has been hand-run for a buyer, so no record has reached G5.
- Deleting or archiving a record.
- The legacy opportunity board is not migrated into problem records.
- Any browser-level automated test. Click → edit → reload is verified at the logic and SSR
  layers only, so the one interaction that matters most is still checked by hand.
- `master` has not been renamed to `main`, and two commits predate the commit standard
  (`40e266b baseline: …`, `c0380b6 Merge pull request #1 …`).

## Checks

| Command | Covers |
|---|---|
| `pnpm test` | 37 assertions across two suites: 16 on opportunity storage, 21 on problem storage — checked-zero vs unchecked-blank, blank counting, ranking, signal repair, corrupt and stale records, id collisions, seed immutability |
| `pnpm build` | Production build, includes typechecking |

CI runs both on every pull request (`build`) and validates Conventional Commits on the PR title
and every commit in the branch (`commits`). A local `commit-msg` hook catches messages earlier,
and `pre-push` refuses a direct push to `master`. On the server, a ruleset requires a pull request
and green checks with no bypass actors, allows squash merges only, and blocks force pushes and
deletion.

## Next steps

1. **Message the freelance developer** who built the same tool for a solo RIA (r/fintech, linked in
   `PROBLEM_LIST.md`). One DM. They know the price, what broke, and why they declined to
   productise it — the highest information per unit of effort available.
2. **Work tiers 2–4** of the target list in `INTERVIEW_GUIDE.md`: the Lisbon hiring managers, the
   CMVM register of autonomous investment consultants, then EU ops leads at 5–50 person firms.
3. **Write the kill criterion by hand** before the first call. `INTERVIEW_GUIDE.md` has a draft.
4. **Fix the buyer on P-002 and P-004** — each names a retail investor or two buyers, and the
   company-buyer set requires exactly one.
5. **Widen the signal set** — the ten problems are roughly four problems restated. The next pass
   should add raw signals from outside finance operations.
6. **Then** widen what the tool holds. The funnel UI is shipped; the constraint is now the data in
   it, not the screen around it.

## Decisions still open

- Whether `statusNote` earns its place as an eleventh field on `Opportunity`.
- Whether the legacy opportunity view is migrated into `Problem` records or retired.
- Whether the inferred seed `stage` values (five `investigate`, one `discovery`) are correct.

## Important files

- `PAIN_FUNNEL.md` — the gates, the ordering rule, and the problem record shape
- `PROBLEM_LIST.md` — the research queue, plus the G2 evidence
- `INTERVIEW_GUIDE.md` — who to talk to and what to ask
- `MVP_SPEC.md` — product scope and acceptance criteria
- `RULES.md` — research methodology
- `HANDOFF_PAIN_FUNNEL.md` — the pending funnel implementation brief
- `RESEARCH_CONTEXT.md` — lessons from the Business Idea Session
- `AGENTS.md` — branch, commit, review, and product-invariant rules
- `HANDOFF_EDITING_PERSISTENCE.md` — completed implementation handoff
