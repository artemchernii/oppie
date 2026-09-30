# oppie.lab — MVP specification

## Purpose

oppie.lab is a readable research workspace for finding and validating problems worth building,
buying, or adapting.

The MVP should help answer two questions, in this order:

> Is this problem real, and will a company pay for it?
>
> Which of the survivors deserves the next small test?

It is not a prediction engine. It has no overall score, no weighted total, and no index — see
`RULES.md` §5 and `PAIN_FUNNEL.md`.

## Status

Two things are true at once, and the difference matters:

- **Shipped.** The opportunity board: six seeded candidates, card and table views, search and
  evidence-status filters, a detail drawer, edit mode, and `localStorage` persistence. The record
  model is `Opportunity`.
- **Specified, not built.** The pain funnel: `Problem` as the main object, the five gates, the
  three axes, and the G2 paid-today field.

`HANDOFF_PAIN_FUNNEL.md` is the implementation brief for the second. Until it lands, the app still
opens on the opportunity board and `MVP_SPEC.md` describes both.

## The main object

The main object is a **`Problem`**, not an `Opportunity`. The full record shape is in
`PAIN_FUNNEL.md` § Problem record; it is not duplicated here.

A problem is tracked on three independent axes — `gate`, `action`, `verdict` — never on one
maturity ladder, and never on a score.

## Core loop

1. Capture a signal, with a source.
2. Rewrite it as a concrete workflow: who, what they do, and where it breaks.
3. Establish that money or headcount is **already** going at the workflow (G2). If not, park or kill.
4. Confirm it repeats across independent firms or roles.
5. Name one buyer with budget and a cold route to them.
6. Hand-run the work for one buyer, with the result that would change our mind written down first.
7. Only then decide between the service path and the product path.
8. Order the survivors by cited facts. Never by a composite.

## MVP screens

### Problems funnel (default view)

- a compact horizontal stage view, one stage per gate
- each stage shows the count of records that passed it, and the count blocked on it
- counts are counts of records, never quality scores
- clicking a stage filters the list

### Problem list

Seeded from `PROBLEM_LIST.md`. Columns: title, affected role / buyer, current workaround, gate,
pays today, next question or test, evidence count. Search and filters. Sorted by the ordering rule,
never by a score column.

Unchecked fields render `Not added yet`. A checked zero renders `0`. The two are never confused.

### Problem detail

A drawer or panel with the editable fields listed in `HANDOFF_PAIN_FUNNEL.md` § Problem detail,
including `paidToday`, `competition`, `moat`, and `targetSegment`, plus evidence as repeatable
sub-records (type, observation, URL, date, confidence).

### Opportunities (legacy)

The six seeded opportunities remain accessible as a secondary view. They are reference data for the
method, not a shortlist, and they are not deleted.

## Minimal data model

`Problem` and `Evidence` are defined in `PAIN_FUNNEL.md` § Problem record. `Opportunity` and
`Source` remain as shipped, until the legacy view is migrated or retired.

## Out of scope

- authentication and teams
- automated web crawling
- AI-generated conclusions
- billing
- notifications
- complex financial modelling
- choosing a final business automatically
- any composite score, weighted total, or ranking beyond `PAIN_FUNNEL.md` § Ordering

## Acceptance criteria

- A user can scan all candidates without opening a long report.
- A user can tell evidence, assumptions, and unknowns apart.
- A record that has not passed every gate is visibly unranked.
- Every problem has a visible kill reason and next test.
- Source links are one click away.
- Search, filtering, and detail view work without a page reload.
- The UI never presents an invented number as a conclusion.
- The six seeded opportunities stay intact and reachable.
