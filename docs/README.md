# docs

Where the thinking lives. The repository rules are in `../AGENTS.md`, the current state in
`../STATUS.md`, and anything decided with a date in `../DECISIONS.md`. This folder is the rest:
the method, the product, and the history.

## Start here

| If you want to | Read |
|---|---|
| understand how the research is done | `RULES.md`, then `PAIN_FUNNEL.md` |
| see the whole pipeline at a glance | `ENGINE.md` |
| know what is being built | `MVP_SPEC.md` |
| do the next piece of research | `PROBLEM_LIST.md`, then `INTERVIEW_GUIDE.md` |
| find out what happened, and why | `handoffs/` |

## Method

- `RULES.md` — how the research is done, and what does not count as evidence
- `PAIN_FUNNEL.md` — the gates, the equal-weight tally and its ordering rule, and the shape of a
  problem record
- `ENGINE.md` — the engine end to end: where it goes, what it looks for, where scoring sits, and the
  proposed v1 arithmetic. A map of the two documents above, not a third rulebook
- `PROBLEM_LIST.md` — the research queue, plus the G2 evidence
- `INTERVIEW_GUIDE.md` — who to talk to, and what to ask

## Product

- `MVP_SPEC.md` — product scope and acceptance criteria
- `RESEARCH_CONTEXT.md` — lessons from the Business Idea Session

## History

`handoffs/` holds the briefs written before a piece of work started. They are kept because the
reasoning is worth more than the diff, and all of them are now complete:

- `handoffs/HANDOFF_SUPABASE.md` — where the Supabase work stands, and still the accurate
  description of storage
- `handoffs/HANDOFF_PAIN_FUNNEL.md` — the funnel implementation brief, shipped
- `handoffs/HANDOFF_EDITING_PERSISTENCE.md` — the persistence work, shipped

`DECISIONS.md` #4 retired new handoffs: software behaviour belongs in `openspec/` as requirements
and scenarios, and anything decided with a date belongs in `DECISIONS.md`. The three files above stay
until their content is captured there, and then go.

A fourth handoff stays at the repository root, `HANDOFF_DEMAND_SEARCH.md`, and is **deliberately
untracked** — it holds personal detail and this repository is public. It is not part of the docs
here, and it should not be committed.
