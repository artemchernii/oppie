# oppie.lab — initial problem list

These are research candidates, not validated opportunities. They are written as problems and
workflows, not products.

**Where the list stands.** The reconciliation cluster — P-001, P-003, P-006 — now clears **G2**:
the workflow is demonstrably paid for, as a salaried job, as a software licence, and as bespoke
custom work. See § G2 evidence. Everything else is still at G1. Research is allowed at every gate;
only *commitment* is gated, per `PAIN_FUNNEL.md`.

## Gates

| ID | Problem | Buyer / affected role | Current workaround | Gate | Pays today (G2) | Competition | Next question |
|---|---|---|---|---|---|---|---|
| P-001 | Client holdings and transactions arrive from multiple brokers in incompatible exports, so someone manually normalizes them before reporting. | **Fund administrator / asset-servicing ops team** (was: independent advisor — see note) | CSV cleanup, spreadsheets, manual imports | **G2** | yes — the normalisation step is a paid job, and vendors bill it separately as custom import work | Orion, Black Diamond, Addepar, Panoramix — all US-custodian-integrated | What does one import cost in staff hours, and does anyone sell ingestion alone? |
| P-002 | A multi-broker investor cannot see accurate allocation, performance, and FX effects in one place. | *retail* self-directed investor | Excel, several tracker apps, manual updates | G1 | not checked | not checked | **Buyer is retail.** Rewrite with a company buyer or park. |
| P-003 | Broker statements, bank settlements, and internal records do not match, leaving exceptions for humans to investigate. | Accounting / finance operations team | Export each system, compare manually, email for clarification | **G2** | yes — the same workflow, paid as a salaried reconciliation role | not checked | Which exceptions repeat, and who is paid to resolve them today? |
| P-004 | Portfolio tools support common equities but become awkward with bonds, funds, private assets, or less-common instruments. | Advisor *or* complex-portfolio investor | Manual transactions, custom spreadsheets | G1 | not checked | not checked | **Two buyers named.** Pick the advisor (company) or park. |
| P-005 | Different currencies and calculation methods make performance and contribution reporting difficult to explain to a client. | Advisor / family-office operator | Manual FX conversions and custom formulas | G1 | not checked | not checked | Is this billed to a client, and is anyone paid specifically for it? |
| P-006 | Treasury teams reconcile trades, settlements, collateral, fees, and regulatory reports across several back-office systems. | Treasury / operations manager | Staff-intensive daily procedures and exception queues | **G2** | yes — high confidence. Multiple live postings in Lisbon, Dublin and London; **€30–45k/yr** in Lisbon | not checked | Does the team buy tooling, or only hire? **G4 risk: enterprise procurement.** |
| P-007 | Client reporting requires collecting PDFs, spreadsheets, emails, and screenshots into one evidence pack. | Advisor / accountant / operations lead | Shared folders, checklists, manual document assembly | G1 | not checked | not checked | What report is produced, for whom, how often? |
| P-008 | Reconciliation work is accurate only when one experienced person remembers all the mapping rules and exceptions. | Small finance team | Tribal knowledge, spreadsheets, handover notes | G1 | not checked | not checked | What happens when that person is absent — does anything get bought? |
| P-009 | Small firms need a repeatable way to review imported data without buying enterprise portfolio-accounting software. | Small advisor / accountant | Existing spreadsheet plus manual review | G1 | partial — licence pricing exists ($5–7k/yr) but the import step is charged as enterprise custom work | not checked | What price and client volume separates "spreadsheet is fine" from "we need help"? |
| P-010 | Regulatory or audit evidence is spread across systems and folders, making completeness and ownership hard to prove. | Compliance / operations lead | Excel matrix, folders, email reminders | G1 | not checked | not checked | Which specific obligation creates recurring pain without requiring us to give legal advice? |

`not checked` renders as an empty field in the app. It is not zero, and it is not a low score — it
is the absence of a check.

**P-001's buyer changed.** The recorded G2 evidence is for fund administrators and asset-servicing
teams, not independent advisors. The record must name one buyer, and the evidence names that one.
The advisor buyer is unproven and moves to P-009.

## Ordering

Ordered per `PAIN_FUNNEL.md` § Ordering: furthest gate passed, then cited pain severity, then the
largest already-paid amount.

| Rank | ID | Gate | Pain severity (cited) | Already paid (cited) | Path |
|---|---|---|---|---|---|
| 1 | P-006 | G2 | yes — daily cut-offs, exception queues, regulatory reporting | **€30–45k/yr** salary, Lisbon, per head doing the workflow | service |
| 2 | P-003 | G2 | not checked beyond the r/Accounting source | licence price accepted in segment: $5–7k/yr | service or product |
| 3 | P-001 | G2 | not checked beyond the r/eupersonalfinance sources | custom data-import work billed by effort | product |

**Read the order with the gates, never instead of them.** P-006 ranks first on budget precisely
because large firms pay salaries — and large firms are where G4's "no procurement committee"
criterion fails. P-006 is the best-evidenced and the least reachable. The reachable candidates are
**P-001 and P-003**: smaller firms, one owner of the pain, no procurement.

## Buyer must be fixed

A record names **exactly one** buyer. These name a retail individual, or two buyers to cover both
cases:

- **P-002** — buyer is a retail self-directed investor. Retail pays least and churns fastest.
- **P-004** — names both an advisor and an investor. The advisor is a company buyer; the investor is not.

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

## G2 evidence — the reconciliation workflow is paid for

Collected 2026-10-01. Confidence per `RULES.md` §1.

### Direct — the workflow is a paid job

**Link status matters here.** Job postings are deleted once the role is filled, so a dead link is
normal — but it has to be labelled, or the record becomes a claim with nothing behind it. On
2026-10-01 the stored links were re-checked: **1 resolved, 3 were gone (404/410), 1 was blocked to
automated fetches, and 3 could not be read.** The app shows a link status on every company row for
this reason.

Live postings whose description *is* multi-custodian position and cash reconciliation:

| Employer | Location | Advertised pay | Link |
|---|---|---|---|
| JJ Search Ltd (City firm) | London | **£35,000–£50,000** | not opened |
| LGT Wealth Management UK | London | **£80,000–£100,000** | not opened |
| Optio Incentives | London | **£80,000–£100,000** | not opened |
| RBC Global Asset Management UK | London | not published | not opened |
| Janus Henderson | Budapest | not published | **opens** |
| Nordea | Portugal | not published | not opened |
| eXalt-Fi | Lisbon | not published | not opened |
| Mediolanum International | Dublin | not published | not opened |
| SimCorp | Europe | not published | not opened |
| Dodge & Cox | US | not published | not opened |
| Blackboardjob (private bank) | Lisbon | not published | **gone** |
| Citi | Bogotá | not published | **gone** |
| Deutsche Börse / Clearstream | Cork | not published | **gone** |

**The London numbers are the strongest yet.** £35,000–£50,000 for a custody reconciliations analyst
and £80,000–£100,000 for a senior one, both advertised on the posting. Optio Incentives states it is
*establishing* a dedicated Reconciliation & Operations function — which is a firm deciding to spend
money on this now, rather than a job that has always existed.

Older, thinner evidence recorded earlier: Lisbon trade-settlement analyst **€30–45k** · Dublin
middle office **€40–55k** · London trade support **£40–55k** (average £49k) · London collateral
**£45–60k** (average £56.8k). These come from salary guides, not postings — marked `reported`.

**Read:** a firm pays £35,000–£100,000 a year, plus employer costs, for one person to do this. That
is a budget line stated out loud in a published document.

### Direct — a price is already accepted in the segment

Panoramix publishes its whole price list ([source](https://www.panoramixfinancial.com/account/pricing/)):

| Tier (AUM) | Annual firm licence |
|---|---|
| under $25M | $5,000 |
| $25–100M | $6,000 |
| $100–200M | $7,000 |
| $200M–2B | $7,000 + 0.004% above $200M |
| over $2B | $80,000 + 0.003% above $2B |

Add-ons: Panoramix Pro $2,500 · ByAllAccounts data feed $1,200 · billing-only −50% · historical
imports "charged based on effort… tens of thousands of dollars for complete transactional data
import".

**Read, and this is the important finding:** the licence is $5–7k/yr. The step charged *separately,
by effort, at up to tens of thousands* is **data import and normalisation**. The incumbent vendors
do not solve messy statement ingestion — they bill it as custom work. That is the same step the
freelance developer below was hired to do, and the same step P-001 describes.

### Direct — the workflow is a standing complaint, and someone is paid to fix it

- r/fintech: a freelance developer **built exactly this for a solo RIA** — "ingests custodian
  statement files, normalizes the holdings, handles FX conversion, and gives my client one
  consolidated view across multiple custodians… no trading, no client-facing output, no performance
  calculations. This is a one-off build for my client, not something I'm turning into a product."
  ([source](https://www.reddit.com/r/fintech/comments/1w1y3ms/developing_internal_portfolio_tooling_for_a_solo/))
- r/CFP: multiple custodians are normal and chosen deliberately — "we've always had at least two in
  order to pin the one against the other in pricing"
  ([source](https://www.reddit.com/r/CFP/comments/1ind3wn/ria_multicustodian/)).
- Orion, the market-share leader in advisor portfolio accounting, advertises direct-custodian
  reconciliation — its competitor set is US-custodian-integrated (Schwab, Fidelity, Pershing).

### Reported — secondhand, not verified

- Cerulli Associates, cited secondhand: the average advisory firm spends **160–240 hours per
  advisor per year** on portfolio reporting, its largest non-client-facing time cost.
- "Nearly a third of RIAs run two or more custodians" — trade press.
- Reported quarterly cycles of 5 days / 120 staff hours collapsing to 6 hours. Source is vendor
  content marketing; treat as advertising, not evidence.
- Kompass directory estimate: **~50 independent advisory firms in Portugal.** Commercial directory,
  not a regulatory census. If accurate, Portugal alone is too small a market — which is itself a
  finding.

### Not checked — and these are the open questions

- Willingness to buy **from a new entrant**, as opposed to hiring or commissioning a bespoke build.
- Whether any of these firms would buy in Europe, where the incumbents' custodian integrations do
  not reach.
- Count and identity of EU firms with this workflow outside Portugal.

The first of those is what `INTERVIEW_GUIDE.md` exists to answer.

## Evidence with no budget attached

- Multibroker fragmentation, inconsistent exports, FX confusion and spreadsheet workarounds:
  [r/eupersonalfinance](https://www.reddit.com/r/eupersonalfinance/comments/1perr1f/how_do_you_track_your_overall_performance_when/),
  [EU portfolio tracking](https://www.reddit.com/r/eupersonalfinance/comments/1sx3z2l/tracking_your_portfolio_in_the_eu_is_messier_than/).
- Mismatches between processor, bank and internal data with manual exception handling:
  [r/Accounting](https://www.reddit.com/r/Accounting/comments/1t3wx6j/anyone_dealing_with_reconciliation_across/).
- UK treasury roles naming settlement investigation, collateral reconciliation, transaction
  reporting, regulatory evidence: [UK Treasury Operations role](https://www.jobs.service.gov.uk/jobs/6a8dda79a6447724dec5ee65).

These prove pain. Pain is not budget.

## Sourcing

| Source | What it proves |
|---|---|
| Job postings | Budget and amount. The highest-yield source for company buyers. |
| Existing tools and pricing pages | A price already accepted in the segment. |
| Communities | Pain intensity and the words buyers use. |
| Regulation and deadlines | The trigger that forces action. |

## Kill conditions

Kill or park a problem if:

- nobody pays for the workflow today (G2 fails);
- people do not perform the workflow repeatedly;
- the current workaround is fast and good enough — including "my custodian's portal shows me
  everything" or "I look twice a year and don't care";
- interviewed buyers mostly describe a workaround they abandoned or still do by hand;
- nobody can identify a buyer with budget;
- the buyer is reachable only through a network that does not exist;
- the work requires a licence, custody of funds, or regulated advice;
- the buyer needs enterprise procurement before a small test is possible — **this is P-006's risk**;
- the only evidence is that other founders think the idea sounds useful.
