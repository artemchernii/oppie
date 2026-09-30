# oppie.lab — initial problem list

These are research candidates, not validated opportunities. They are deliberately written as problems and workflows, not products.

| ID | Problem | Buyer / affected role | Current workaround | Current state | Next question |
|---|---|---|---|---|---|
| P-001 | Client holdings and transactions arrive from multiple brokers in incompatible exports, so someone manually normalizes them before reporting. | Independent advisor / portfolio administrator | CSV cleanup, spreadsheets, manual imports | evidence | How many client packs per month, and how long does one take? |
| P-002 | A multi-broker investor cannot see accurate allocation, performance, and FX effects in one place. | Self-directed investor / family office assistant | Excel, several tracker apps, manual updates | evidence | Is the pain frequent and costly enough outside power users? |
| P-003 | Broker statements, bank settlements, and internal records do not match, leaving exceptions for humans to investigate. | Accounting / finance operations team | Export each system, compare manually, email for clarification | evidence | Which exceptions repeat, and who owns resolution? |
| P-004 | Portfolio tools support common equities but become awkward with bonds, funds, private assets, or less-common instruments. | Advisor / complex-portfolio investor | Manual transactions, custom spreadsheets | evidence | Which asset type creates the most unrecoverable work? |
| P-005 | Different currencies and calculation methods make performance and contribution reporting difficult to explain to a client. | Advisor / family-office operator | Manual FX conversions and custom formulas | evidence | Is this a monthly reporting problem or an occasional annoyance? |
| P-006 | Treasury teams reconcile trades, settlements, collateral, fees, and regulatory reports across several back-office systems. | Treasury / operations manager | Staff-intensive daily procedures and exception queues | evidence | Which narrow process can be tested without bank-grade integrations? |
| P-007 | Client reporting requires collecting PDFs, spreadsheets, emails, and screenshots into one evidence pack. | Advisor / accountant / operations lead | Shared folders, checklists, manual document assembly | new | What report is produced, for whom, and how often? |
| P-008 | Reconciliation work is accurate only when one experienced person remembers all the mapping rules and exceptions. | Small finance team | Tribal knowledge, spreadsheets, handover notes | new | What happens when that person is absent or leaves? |
| P-009 | Small firms need a repeatable way to review imported data without buying enterprise portfolio-accounting software. | Small advisor / accountant | Existing spreadsheet plus manual review | new | What price and client volume separates “spreadsheet is fine” from “we need help”? |
| P-010 | Regulatory or audit evidence is spread across systems and folders, making completeness and ownership hard to prove. | Compliance / operations lead | Excel matrix, folders, email reminders | new | Which specific obligation creates recurring pain without requiring us to give legal advice? |

## Evidence already found

- European investors describe multi-broker fragmentation, inconsistent exports, FX confusion, and spreadsheet workarounds: [r/eupersonalfinance](https://www.reddit.com/r/eupersonalfinance/comments/1perr1f/how_do_you_track_your_overall_performance_when/) and [EU portfolio tracking discussion](https://www.reddit.com/r/eupersonalfinance/comments/1sx3z2l/tracking_your_portfolio_in_the_eu_is_messier_than/).
- Accounting teams describe mismatches between processor, bank, and internal data, with manual exception handling: [r/Accounting](https://www.reddit.com/r/Accounting/comments/1t3wx6j/anyone_dealing_with_reconciliation_across/).
- UK treasury roles explicitly include settlement investigation, collateral reconciliation, transaction reporting, and regulatory evidence maintenance: [UK Treasury Operations role](https://www.jobs.service.gov.uk/jobs/6a8dda79a6447724dec5ee65).

These sources show that the workflows exist. They do not prove willingness to buy.

## Kill conditions

Kill or park a problem if:

- people do not perform the workflow repeatedly;
- the current workaround is fast and good enough;
- nobody can identify a buyer with budget;
- the work requires a licence, custody of funds, or regulated advice;
- the buyer needs enterprise procurement before a small test is possible;
- the only evidence is that other founders think the idea sounds useful.
