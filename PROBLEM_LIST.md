# oppie.lab — initial problem list

These are research candidates, not validated opportunities. They are written as problems and
workflows, not products.

**Read this before the table.** Under the gate model in `PAIN_FUNNEL.md`, no problem here has
passed G2 — *paid today*. Every one of them has a source that shows the workflow exists; none has a
source showing that money or headcount is already going at it. That makes this list a **search
queue**, and it means **nothing below is ranked**. Ordering an unverified record is the failure the
model exists to prevent.

## Gates

| ID | Problem | Buyer / affected role | Current workaround | Gate | Pays today (G2) | Competition | Next question |
|---|---|---|---|---|---|---|---|
| P-001 | Client holdings and transactions arrive from multiple brokers in incompatible exports, so someone manually normalizes them before reporting. | Independent advisor / portfolio administrator | CSV cleanup, spreadsheets, manual imports | G1 | not checked | not checked | Does an advisory or accounting firm already pay a person to do this? Find the posting or the invoice. |
| P-002 | A multi-broker investor cannot see accurate allocation, performance, and FX effects in one place. | *retail* self-directed investor | Excel, several tracker apps, manual updates | G1 | not checked | not checked | **Buyer is retail.** Either rewrite with a company buyer or park — see "Buyer must be fixed". |
| P-003 | Broker statements, bank settlements, and internal records do not match, leaving exceptions for humans to investigate. | Accounting / finance operations team | Export each system, compare manually, email for clarification | G1 | not checked | not checked | Which exceptions repeat, and who is paid to resolve them today? |
| P-004 | Portfolio tools support common equities but become awkward with bonds, funds, private assets, or less-common instruments. | Advisor *or* complex-portfolio investor | Manual transactions, custom spreadsheets | G1 | not checked | not checked | **Two buyers named.** Pick the advisor (company) and drop the investor, or park. |
| P-005 | Different currencies and calculation methods make performance and contribution reporting difficult to explain to a client. | Advisor / family-office operator | Manual FX conversions and custom formulas | G1 | not checked | not checked | Is this billed to a client, and is anyone paid specifically for it? |
| P-006 | Treasury teams reconcile trades, settlements, collateral, fees, and regulatory reports across several back-office systems. | Treasury / operations manager | Staff-intensive daily procedures and exception queues | G1 | **Candidate:** the cited UK Treasury Operations posting names settlement investigation, collateral reconciliation and transaction reporting — the workflow is paid as a salary. Amount not checked, so G2 is not complete. | not checked | What does that role pay, and how many such postings exist per month? |
| P-007 | Client reporting requires collecting PDFs, spreadsheets, emails, and screenshots into one evidence pack. | Advisor / accountant / operations lead | Shared folders, checklists, manual document assembly | G1 | not checked | not checked | What report is produced, for whom, how often — and who assembles it? |
| P-008 | Reconciliation work is accurate only when one experienced person remembers all the mapping rules and exceptions. | Small finance team | Tribal knowledge, spreadsheets, handover notes | G1 | not checked | not checked | What happens when that person is absent or leaves — does anything get bought? |
| P-009 | Small firms need a repeatable way to review imported data without buying enterprise portfolio-accounting software. | Small advisor / accountant | Existing spreadsheet plus manual review | G1 | not checked | not checked | What price and client volume separates "spreadsheet is fine" from "we need help"? |
| P-010 | Regulatory or audit evidence is spread across systems and folders, making completeness and ownership hard to prove. | Compliance / operations lead | Excel matrix, folders, email reminders | G1 | not checked | not checked | Which specific obligation creates recurring pain without requiring us to give legal advice? |

`not checked` renders as an empty field in the app. It is not zero, and it is not a low score — it
is the absence of a check.

## Ordering

Ordered per `PAIN_FUNNEL.md` § Ordering: furthest gate passed, then cited pain severity, then the
largest already-paid amount.

| Rank | ID | Gate | Pain severity (cited) | Already paid (cited) | Path |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

**Empty on purpose.** No record has passed G2, so there is nothing to order. The table exists so
that the first record to clear G2 appears in it, and so that an empty rank is visibly an empty
rank rather than an unfinished one.

## Buyer must be fixed

A record names **exactly one** buyer. These two name a retail individual, or two buyers to cover
both cases, so they are outside the company-buyer set until rewritten:

- **P-002** — buyer is a retail self-directed investor. Retail pays least and churns fastest.
- **P-004** — names both an advisor and an investor. The advisor is a company buyer; the investor
  is not.

P-005 names "advisor / family-office operator". Both are companies, so it stays, but the record
should settle on one.

## The list is less diverse than it looks

Ten rows, roughly four problems:

| Cluster | Records |
|---|---|
| Multi-broker normalisation and reconciliation | P-001, P-003, P-004, P-006 |
| FX and attribution in reporting | P-002, P-005 |
| Evidence-pack and reporting assembly | P-007, P-010 |
| Key-person dependency on mapping rules | P-008, P-009 |

A funnel is a convergence machine. This set has already converged, so the funnel has little to do.
The next research pass should add raw signals from **outside** finance operations — other domains,
other roles — before any more depth is added to this cluster.

## Evidence already found

- European investors describe multi-broker fragmentation, inconsistent exports, FX confusion, and spreadsheet workarounds: [r/eupersonalfinance](https://www.reddit.com/r/eupersonalfinance/comments/1perr1f/how_do_you_track_your_overall_performance_when/) and [EU portfolio tracking discussion](https://www.reddit.com/r/eupersonalfinance/comments/1sx3z2l/tracking_your_portfolio_in_the_eu_is_messier_than/). Shows pain, not budget.
- Accounting teams describe mismatches between processor, bank, and internal data, with manual exception handling: [r/Accounting](https://www.reddit.com/r/Accounting/comments/1t3wx6j/anyone_dealing_with_reconciliation_across/). Shows pain, not budget.
- UK treasury roles explicitly include settlement investigation, collateral reconciliation, transaction reporting, and regulatory evidence maintenance: [UK Treasury Operations role](https://www.jobs.service.gov.uk/jobs/6a8dda79a6447724dec5ee65). **Shows the workflow is paid as a salary** — the only budget evidence in the list.

No source here proves willingness to buy a product. Two of three prove pain; one proves that an
employer pays for the work.

## Leads to verify, not yet evidence

Unverified starting points for the competition column. Nothing here has been checked in this repo;
confirm counts, segments, and prices before it enters a record.

- Portfolio accounting and reporting incumbents, and reconciliation tooling vendors.
- Job-posting volume for the P-006 workflow, per month, per geography.

## Sourcing

| Source | What it proves |
|---|---|
| Job postings | Budget and amount. The highest-yield source for company buyers. |
| Communities | Pain intensity and the words buyers use. |
| Existing tools and pricing pages | A price already accepted in the segment. |
| Regulation and deadlines | The trigger that forces action. |

## Kill conditions

Kill or park a problem if:

- nobody pays for the workflow today (G2 fails);
- people do not perform the workflow repeatedly;
- the current workaround is fast and good enough;
- interviewed buyers mostly describe a workaround they abandoned or still do by hand;
- nobody can identify a buyer with budget;
- the buyer is reachable only through a network that does not exist;
- the work requires a licence, custody of funds, or regulated advice;
- the buyer needs enterprise procurement before a small test is possible;
- the only evidence is that other founders think the idea sounds useful.
