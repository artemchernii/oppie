# Ideas board — design

Date: 2026-10-04. Approved in chat by the owner (option A cards, parts 1–3).

## Plain version

The home page becomes **Ideas**: one card per theme the research covered (contract renewals,
invoice chasing, NIS2, …). Each card shows three numbers — complaints found, sellers found, and the
cheapest and dearest quoted price — plus a one-word badge and one line saying whether it is worth
time. Clicking a card opens one page with four boxes (the answer, who sells it, proof people
complain, what is still unknown) and three buttons: Pursue, Park, Drop. Each button asks for one
sentence. Nothing changes status without that click.

## Why

Thirty searches produced 95 waiting proposals and a verdict table in `STATUS.md`, and none of it was
visible in the app. The home page showed ten seed problems from before discovery existed. The owner
could not tell which ideas were worth their time.

## Precise version

### Where each thing comes from

| Shown | Source | Live? |
|---|---|---|
| Title, one-line answer, unknowns, verdict badge, icon | `lib/ideas.ts`, written by the agent, reviewed in a PR | no — changes by PR |
| Which runs belong to an idea | `lib/ideas.ts` (`runIds`) | no |
| Complaints | count of `discovery_sources` in those runs with `signal_type = 'pain'` and `triage <> 'discarded'` | yes |
| Sellers | distinct business names parsed from `discovery_proposals.business_pattern` in those runs | yes |
| Searches | number of runs | yes |
| Price low / high | `lib/ideas.ts`: seller and the quoted text, verbatim, copied from a checker-kept business line or a page read in research | no |
| Two quotes | `lib/ideas.ts` names the source ids; the excerpt is read live from `discovery_sources` and shown verbatim | yes |
| Owner decision | new table `idea_decisions` | yes |

### Rules kept

- The agent's line is labelled **Agent note** everywhere. The verdict badge is part of that note.
- Prices are quoted text with the seller named. Nothing is parsed, converted, summed or averaged.
- A decision needs a status (`pursue`, `park`, `drop`) and a non-empty reason, enforced in code and
  by a `check` constraint. Each decision is a new row; the newest row is the current status.
- Before the migration is applied, the board still renders; decisions show "Not decided" and the
  buttons say the table is missing.
- The ten seed problems are untouched. The list moves from `/` to `/problems`.
- Non-English runs label pain as `context`, so their complaint count reads low. The detail page says
  so when an idea includes non-English runs.

### Pages

- `/` — Ideas board. Header line: `N ideas · D decided · W waiting for you`. Cards sorted: undecided
  first, then by complaints (a count, not a score).
- `/ideas/[id]` — four boxes and the decision buttons.
- `/problems` — the former home page, renamed "Tracked problems".
- Menu: Ideas, Discover, Inbox, Tracked problems. Companies stays reachable but leaves the menu.

### Not in this version

- Pursue does not create a tracked problem yet; that reuses the inbox acceptance in a later PR.
- Inbox cleanup is separate.

### Owner actions

- Apply `supabase/migrations/20261008000000_idea_decisions.sql` in the Supabase SQL editor. It also
  records the NIS2 "park" decision the owner made in chat on 2026-10-04.

### Tests

- Unit: seller parsing, complaint/seller counting, decision validation, newest-decision-wins.
- Playwright: board renders cards with numbers; detail page shows four boxes; a decision without a
  reason is refused; light, dark and 375px.
