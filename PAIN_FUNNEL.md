# oppie.lab — pain-to-business funnel

oppie.lab starts with problems, not startup ideas.

The funnel has two halves, and **order matters**:

1. **Gates** — binary, evidence-required, in order. Answers *is this real, and will a company pay?*
2. **Ordering** — only for records that passed every gate. Answers *which one first?*

A record is never ordered before it has passed the gates. An unverified record with a rank is the
exact failure this model exists to prevent: the rank becomes a substitute for the evidence.

## Part 1 — Gates

Pass/fail. Each gate names the evidence it requires. Failing a gate parks or kills the record with
the reason recorded; it does not lower a score, because there is no score.

```text
G1  Signal        observed behaviour, one source, one sentence
G2  Paid today    someone already spends money or salary on this workflow
G3  Repeats       the same workflow in ≥3 independent firms or roles
G4  Buyer owns it a named role with budget authority, cold-reachable, no procurement committee
G5  Hand-tested   you did the work by hand for one buyer, and they reacted
```

### G1 — Signal

Something observed in a discussion, job posting, review, company workflow, regulation, or personal
experience.

Required: source link and a one-sentence signal.

### G2 — Paid today

**The gate that filters hardest, and the one that separates a problem from a nice-to-have.** Not
"they complain about it" — *is money or headcount already going at this workflow?*

Counts as evidence:

- a job posting whose description **is** the workflow — the salary is the price already being paid;
- an existing paid tool at a published price, bought by firms in this segment;
- a contractor invoice, or an internal headcount;
- a budget line someone will name out loud.

Does not count: complaints, upvotes, "would you use this", or another founder's enthusiasm.

Required: what is paid, roughly how much, and a link.

### G3 — Repeats

At least three independent people, firms, or roles describe the same behaviour, or one buyer shows
a recurring internal workflow.

Required: observed frequency, and the current workaround in their words.

### G4 — Buyer owns it

A named role that owns the problem, controls the budget, and can say yes without a procurement
committee.

Required: buyer role, reachable segment, why they have budget — **and a cold route to them.**
Job postings, trade directories, professional communities, and published professional bodies all
count. A buyer reachable only through a personal network that does not exist parks the record
regardless of its merit.

### G5 — Hand-tested

Test the outcome manually before building software. Reconcile one client pack, clean one month of
broker exports, produce one exception report.

Required: the test, a time limit, a cost limit, and the result that would change our mind — written
**before** the test runs.

## Part 2 — Ordering, not scoring

There is no composite score. Not `83/100`, not `Pain ×2 + Market ×3`, not a weighted total.
Weights are invented, and summing weeks against euros against ordinal severity produces a number
that measures nothing. **Cited inputs do not rescue an invented aggregation.**

What is allowed is an ordering fully determined by cited facts:

1. **Furthest gate passed** — `G5` above `G4`, above `G3`, above `G2`. A fact about the world.
2. Within one gate, **pain severity**, where severe is a cited yes/no: does inaction trigger a
   penalty, a failed audit, a lost client, or stopped growth?
3. Within equal severity, **the largest already-paid amount**, cited in euros per month, or as a salary.

No weights. Nothing enters the order that is not a quote, a date, and a URL.

`0` and blank are different things:

- `0` — checked, and the answer is no.
- blank — not checked. Renders `Not added yet`. Never as zero, never as a guess.

A row with four blanks is visibly a guess, and it is named as one in the same table.

### Reverse-target arithmetic

One computed number is allowed, because it is arithmetic rather than judgement:

```text
customers needed = €10,000 net/month ÷ net price per customer per month
```

Sanity check that goes with it: **can you name 50 firms in the segment?** If not, the segment is
wrong or the research is incomplete. Never take TAM from a report; build it bottom-up as
`firms × share with the workflow × price`.

Honest note on capital: €20–30k at a 25–30% margin turned 4–8× a year returns roughly
€1.5–6k/month, not €10k. A capital-only path needs leverage — supplier terms, debt, or other
people's money. Service and software revenue are not bound by that arithmetic, which is one reason
they are the paths this funnel is pointed at.

### Moat is a gate on strategy, not on the opportunity

For a small operator, a moat is almost never technology. It is access, distribution, switching
cost, a system-of-record position, or a niche too small for incumbents to bother with. No moat plus
real paid pain plus a small niche is a **service business** — a legitimate outcome, not a failure
(see `RULES.md` §10). Killing it for lack of moat loses money.

```text
pain ≤ 1                        → kill, whatever the moat
pain ≥ 2 and moat 0–1           → service path: do the work, automate what repeats
pain ≥ 2 and moat ≥ 2           → product path: build the narrowest thing that replaces the manual step
```

## Problem record

Three axes, deliberately separate. One ladder conflates them, and then a problem cannot be
"repeated *and* being hand-run *and* parked" without losing one of the three facts.

```text
Problem
  id
  title
  gate          G1-signal | G2-paid | G3-repeated | G4-buyer | G5-tested
  action        idle | researching | interviewing | hand-running | building
  verdict       open | parked | killed
  domain
  affectedRole
  problemStatement
  currentWorkaround
  frequency
  businessConsequence
  buyer
  whyTheyPay
  paidToday     whatIsPaid, amount, evidenceUrl        ← the G2 record
  competition   count, names[], priceRange, evidenceUrl
  moat          level 0–3, advantage, path: service | product
  targetSegment firmsNameable, netPricePerMonth, customersNeeded
  skillFit
  evidence[]
  unknowns[]
  killReason
  nextTest
  createdAt
  updatedAt

Evidence
  type: conversation | reddit | job | company | pricing | review | regulation | personal
  quoteOrObservation
  sourceUrl
  sourceDate
  confidence: direct | reported | inferred
```

`gate` is where the record is in the funnel. `action` is what we are doing about it. `verdict` is
the decision. None of the three substitutes for the others.

## Writing a problem

The signal must be rewritten as a concrete workflow before it can pass G1.

Bad: "Finance is inefficient."

Good: "An advisor manually reconciles client holdings across three broker exports before producing
a quarterly report."

Required: who, what they do, and where it breaks.

## Kill conditions

Kill or park a problem if:

- **nobody pays for the workflow today** (G2 fails);
- people do not perform the workflow repeatedly;
- the current workaround is fast and good enough — including "my broker shows me everything" or
  "I look twice a year and don't care";
- interviewed buyers describe a workaround they abandoned or still do by hand in fewer than half
  of cases — the pain is not shared;
- nobody can identify a buyer with budget;
- the buyer is reachable only through a network that does not exist;
- the work requires a licence, custody of funds, or regulated advice;
- the buyer needs enterprise procurement before a small test is possible;
- the only evidence is that other founders think the idea sounds useful.

## Research scope

Target shape: a **5–50 person EU/UK finance, compliance, or ops firm**, where the founder or an ops
lead owns both the pain and the budget.

Adjacent to real skills and context:

- finance operations
- investing and portfolio data
- reconciliation and exception handling
- reporting and evidence packs
- multi-currency and multi-account workflows
- treasury and settlement operations
- compliance administration where no licence is required
- organization-heavy work that currently lives in spreadsheets, PDFs, email, and screenshots

**Retail and prosumer problems rank last on purpose.** Individuals pay least and churn fastest. A
record whose buyer is a retail investor, or that names two buyers to cover both cases, is not a
company-buyer record yet. Name exactly one buyer.

## Where real pain comes from

| Source | What it proves |
|---|---|
| Job postings | Budget, and the amount — a posting is a firm already paying a salary for the workflow, and it describes the workaround and tooling in public |
| Communities (Reddit, forums, trade bodies) | Pain intensity, and the words buyers use for it |
| Existing tools and their pricing pages | That a price is already accepted in this segment |
| Regulation and deadlines | The trigger event that forces action |

Job postings are the highest-yield source for company buyers because they publish the budget and
the workflow together. Dedupe postings by workflow: the cluster size is a market-size proxy, and
the salary is an upper bound on willingness to pay that is already being spent.

The initial list is a search queue, not a shortlist of businesses.

## The next action is not in this repo

Twenty conversations, one week, €0, no code. Behaviour questions only — never hypotheticals.

| Ask this | Never ask this |
|---|---|
| "How many brokers/accounts do you hold? When did you last total them up, and what did you use?" | "Would you use an app that…" |
| "Show me the spreadsheet or screenshot you used. Where does it break?" | "Would you pay €X/month?" |
| "Have you tried a tool for this? Why did you stop?" | "Is this a problem for you?" |

Everyone answers yes to "is this a problem?". Nobody lies about "what did you use last month".

The kill criterion goes in writing before the first conversation, not after.
