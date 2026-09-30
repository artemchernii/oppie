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
- **Every problem has its own page** at `/problems/<id>`, prerendered. Routes: `/` list ·
  `/problems/[id]` detail · `/companies` the numbers · `/opportunities` the legacy board.
- **Second research pass from new sources.** Public procurement documents (buyers stating the
  workflow as a contract requirement), the FCA CASS daily-reconciliation obligation, F2 Strategy's
  market survey (67% multi-custodian), and enterprise price points (Duco $80k/yr, ReconArt
  $300/user/month). 21 companies now carry a number. P-001 advanced to G3.

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
| `pnpm test` | 24 assertions across two suites: 16 on opportunity storage, 8 on problem storage and source labelling — checked-zero vs unchecked-blank, blank counting, ranking, signal repair, corrupt and stale records, id collisions, seed immutability, and the rule that nothing can be labelled “direct” on a link that was never opened |
| `pnpm build` | Production build, includes typechecking |

CI runs both on every pull request (`build`) and validates Conventional Commits on the PR title
and every commit in the branch (`commits`). A local `commit-msg` hook catches messages earlier,
and `pre-push` refuses a direct push to `master`. On the server, a ruleset requires a pull request
and green checks with no bypass actors, allows squash merges only, and blocks force pushes and
deletion.

## Next steps

1. **Research the six backlog records** from the new source classes. Procurement documents and
   regulatory drivers proved far better than job boards; job boards only show that a role exists,
   while an RFP shows a buyer writing the requirement down.
2. **Message the freelance developer** who built the same tool for a solo RIA.
3. **Test the P-001 thesis**: is the middle real? A firm too big for a spreadsheet and far too small
   for an $80k Duco licence, handling European broker files.
4. **A research engine is the open question.** Collecting sources automatically is possible; drawing
   conclusions automatically is forbidden by `AGENTS.md` §6, so the engine would have to stop at
   gathering. Not built.
5. **Then** widen what the tool holds, not the screen around it.

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
