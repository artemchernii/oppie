# UK Making Tax Digital back office — pricing check

Date: 2026-10-04. Idea card: `uk-mtd-desk-for-accountants` in `lib/ideas.ts`.

## Plain version

UK accountancy firms already buy this work from outsourcers. The cheapest published price is
**£10 a client a month** (Initor Global, small clients), going up to **£35** for busier clients.
Firms resell it to their own clients at **£75–£125 a quarter** (£25–£42 a month), so they keep the
difference.

A bookkeeper in Lisbon costs more per hour than one in India: roughly **£13–£21 an hour** with
employer costs, against **£8–£15** for Indian outsourcers. So a Lisbon team cannot win on price
alone. It wins only if your software makes each client take minutes instead of hours.

- Done by hand (1½–3 hours per client per quarter), one Lisbon bookkeeper handles about
  **200 clients** and costs **£7–£21 a client a month** — at or above Initor's £10–£35 price.
  No business.
- With software doing the sorting (about 45 minutes per client per quarter), the same person
  handles about **530 clients** at **£3–£5 a client a month**. At £20 a client that is roughly
  £128,000 a year of sales per bookkeeper against about £21,000–£33,000 of cost.

**These two lines are arithmetic on the assumptions below, not a forecast.** Nobody has measured
how long your software would take. That number decides whether this is a business.

## Precise version

### What UK practices pay outsourcers (wholesale)

| Seller | Offer | Price | Source |
|---|---|---|---|
| Initor Global | MTD for Income Tax, fixed monthly per client, by bookkeeping transactions a month | Lite £10–£25, Premium £15–£30, Full £20–£35 (up to 25 … 76–100 transactions); free trial up to 10 hours, 72-hour turnaround | https://initor-global.co.uk/use-outsourcing-to-price-mtd-for-income-tax-services-effectively/ |
| Indian outsourcers (guide) | hourly | "£8 to £15 per hour for UK work" | https://exuberantglobal.co.uk/blog/complete-guide-to-accounting-outsourcing-in-2026 |
| QX Global | dedicated senior accountant | "£1000/month to £1800/month for a senior accountant with 2 years' experience" | https://qxglobalgroup.com/how-much-does-it-cost-to-outsource-accounting-services/ |
| Digital Tax Service (UK) | white-label MTD onboarding, quarterly admin, overflow | "There's no fixed package" | https://digital-tax-service.co.uk/mtd-accountants |

### What practices charge their own clients (retail)

- £75–£125 per quarter for the quarterly update element alone (https://mtd.digital/mtd-income-tax/mtd-cost/).
- "Most accountants charge £100–£300 per quarter for this" (https://wise.com/gb/blog/cost-of-outsourcing-accounting).
- A practice with 100 MTD clients now files 400 quarterly updates and 100 final declarations a year
  instead of 100 returns (https://brightsg.com/blog/making-tax-digital-for-accountants-your-complete-mtd-it-compliance-guide/).

### Incumbents

QX has 500+ UK firm clients including the top 20 (https://www.accountingexcellence.co.uk/partners/qx/)
and 2,400+ staff. Advancetrack, Acenteus, Corient, Aone and Initor sell to the same firms.
Channels seen: free trials (Initor, 10 hours), referral schemes, industry awards and content
(Advancetrack's Accounting Talent Index), AccountingWEB and Accountex.

### Cost side — assumptions, each stated

| Input | Value | Basis |
|---|---|---|
| Lisbon bookkeeper salary | €20,115 (average) – €31,293 (high) a year | https://www.salaryexpert.com/salary/job/bookkeeper/portugal ; Glassdoor (see card) |
| Employer social security | +23.75% | https://boundlesshq.com/blog/payroll-in-portugal/ |
| Loaded cost | €24,892 – €38,725 a year | arithmetic |
| Productive hours | 1,600 a year | **assumption** |
| EUR → GBP | 0.85 | **assumption**, not a quoted rate |
| Loaded cost per hour | about £13.2 – £20.6 | arithmetic |
| Time per client per quarter, by hand | 1.5 – 3 hours | 30–60 minutes a month for a small landlord or sole trader (https://briefcase.so/blog/first-mtd-itsa-quarterly-submission-guide) |
| Time per client per quarter, with software | 45 minutes | **assumption** — the target the software must hit; unmeasured |

### Arithmetic (not a forecast)

| Case | Clients per bookkeeper | Cost per client per month | Sales per bookkeeper at £20/client/month |
|---|---|---|---|
| By hand, 1.5–3 h/quarter | 133 – 267 (≈200) | £6.6 – £20.6 | £32,000 – £64,000 |
| Software target, 45 min/quarter | ≈533 | £3.3 – £5.2 | ≈£128,000 |

Not counted: management, sales, software build, AML registration (£300 + £400 a year), insurance,
office, client churn, the 30% of a year spent on year-end declarations.

### Verdict

- **Money moves**: yes — published wholesale prices, retail prices, and a capacity crunch.
- **Price advantage from Lisbon**: no. Indian outsourcers are cheaper per hour.
- **What could make it work**: software that cuts minutes per client, sold with UK-hours service.
  That is an unmeasured assumption, and it is the next thing to test.

### Not verified

- Glassdoor and SalaryExpert are self-reported salary aggregators.
- Whether UK firms pay more for a European team in UK hours: no source found either way.
- Data protection for UK client data processed in Portugal: not checked in this session.

## Timed spike on fake data (2026-10-04)

Plain version: on four made-up landlords, a simple rule-based sorter plus a person came to
**5–29 minutes per client per quarter**, under the 45-minute line where the numbers work. Even the
"blind" landlord, whose payees the rules had never seen, took 15–29 minutes, because a landlord has
only about a dozen different payees and each one is decided once. **This is fake data and assumed
human speed. It says the idea is plausible, not that it works.**

Precise version: `research/mtd-spike/README.md` (rows, rules hit, payees, assumptions). The time
not measured is the likely real cost: onboarding, missing information, and chasing clients.

Next test, in order of value: (1) a real, anonymised bank export used with the owner's consent;
(2) ask two or three UK practices how long a quarterly update takes them today.
