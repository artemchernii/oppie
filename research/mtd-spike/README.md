# MTD quarterly update — timed spike (THROWAWAY)

Fake data only. Every payee, name and amount in `generate.js` is invented. Not product code.

Run: `node research/mtd-spike/run.js` (seeded, so results repeat).

| Landlord (one quarter, 6 Apr – 5 Jul 2026) | Rows | Sorted by rules | Sent to a person | Different payees to decide | Estimated person-minutes |
|---|---|---|---|---|---|
| A — 1 flat via agent, own account | 12 | 12 (100%) | 0 | 0 | 5–10 |
| B — 3 houses, self-managed, own account | 27 | 22 (81%) | 5 | 4 | 8–15 |
| C — 2 flats through a personal account | 71 | 55 (77%) | 16 | 10 | 13–26 |
| D — BLIND: payees the rules never saw | 19 | 0 (0%) | 19 | 11 | 15–29 |

Sorting itself takes under 1 ms per landlord; all the time is the person.

Assumptions (not measured): 30–60 seconds for a trained person to decide one flagged row, plus
5–10 minutes per client to open, sanity-check totals and submit. The rules in `categorise.js` were
written knowing A–C, so A–C flatter the rules; D is the honest case.

Not covered: first-quarter onboarding (2–4 hours per client in one guide), the year-end Final
Declaration, splitting mortgage interest from capital (needs the lender's annual statement; HMRC
treats quarterly updates as provisional), missing receipts, joint ownership, and chasing the client
for information — which in real practice is likely the biggest time cost.
