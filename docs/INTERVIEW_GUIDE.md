# oppie.lab — who to talk to, and what to ask

The artifact that answers *what do I ask, and who?* Research produces the target list and the
vocabulary; this file turns them into conversations.

## The problem, stated once

**Reconciling positions, cash, and transactions across multiple custodians and brokers from
statement files, before reporting.**

`docs/PROBLEM_LIST.md` § G2 evidence shows this is paid for three ways: as a salaried job, as a software
licence, and as bespoke custom work. The unproven part is not whether anyone pays — it is whether
anyone buys **from a stranger** instead of hiring or commissioning.

## Who to talk to

In order of information per unit of effort. Start at the top.

| Tier | Who | How to reach them | Why them |
|---|---|---|---|
| 1 | The freelance developer who built this for a solo RIA (r/fintech, linked in `docs/PROBLEM_LIST.md`) | One direct message | They already did the work. They know the price, what broke, what the client said, and why they chose not to productise it. Highest information per effort available anywhere. |
| 2 | The hiring manager behind the Lisbon and Portugal postings — eXalt-Fi, HN Services, Nordea's Backoffice Reconciliation team | The contact on the posting, or LinkedIn | They are paying for this workflow **today** and can state the salary. Ask about the workflow, never for a job. |
| 3 | Licensed Portuguese autonomous investment consultants | CMVM publishes the register of *consultores para investimento autónomos* — a named list | Regulated, named, contactable, and small enough that they answer. |
| 4 | Operations leads at 5–50 person advisory, family-office, and fund-administration firms across the EU | Trade associations, LinkedIn, local directories | The company-buyer target shape from `docs/PAIN_FUNNEL.md` § Research scope. |

**Do not start with retail investors.** They pay least, churn fastest, and `docs/PROBLEM_LIST.md` already
flags P-002 as the retail record.

## The script

Behaviour only. Never a hypothetical.

1. "Walk me through how a client's positions get from the custodian into your report. Who touches it first?"
2. "Show me a file as it arrives. What does one from [custodian] look like?"
3. "How many custodian and broker formats do you handle? Which one wastes the most time?"
4. "When a break appears, who investigates it, and how do they find the cause?"
5. "What did you use before this? Why did you stop?"
6. "How long does one client pack take, and how many do you produce a month?"
7. "Did you hire someone for this, or buy something? What did it cost?"
8. "What happened the last time a report went out with a wrong number?"

| Never ask | Why |
|---|---|
| "Would you use an app that…" | Invites a polite fiction. |
| "Would you pay €X per month?" | The number anchors the answer and produces a yes that means nothing. |
| "Is this a problem for you?" | Everyone says yes. Nobody lies about last month. |

## Vocabulary to listen for

If they use these words unprompted, the workflow is real and specific:
**break · exception · position file · custodian file · held-away assets · NAV · cash and stock
reconciliation · settlement investigation · market value reconciliation · quarterly pack.**

If they say "my custodian's portal shows me everything" or "I look twice a year and don't care",
that is a kill.

## Kill criterion — write it down before the first call

Draft, to be edited by hand before starting:

> If **10 of 20** describe a manual workaround they maintain and can **show me an actual file**,
> continue to a hand-run test. If they describe the problem as solved by their custodian's portal,
> or as an annual non-issue, kill the thesis and move to the next pain.

Editing this before the first conversation is the whole point. A kill criterion written afterwards
is a justification.

## What not to do

- Do not write code during this pass.
- Do not ask about a product, or describe one.
- Do not treat one enthusiastic answer as evidence. Three independent firms is the G3 threshold.
- Do not confuse "I could build that" with "someone will pay for it". Building is not the
  constraint and never has been.
