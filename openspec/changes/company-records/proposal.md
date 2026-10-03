## Why

The problems funnel says who might pay. Nothing says **who already does**. That gap is load-bearing:
the rubric's `competition` dimension comes back `unknown` on almost every record, because the record
model has no structured place for a competitor's price, and the `/companies` screen shows one flat
table where the money is three currencies, two different payers and four different pricing footings
side by side with nothing to say they are not comparable.

The data is already there — 21 researched companies, 13 with a figure — it is just in a shape that
cannot be grouped or read at a glance. `docs/ENGINE.md` § *Where we go* names vendor pricing pages and
job postings as two of the strongest sources. This is what that material becomes.

## What Changes

- **Companies become records.** The 21 in `lib/problems.ts` are research findings, not placeholders,
  so they are loaded into `companies` once and the table becomes the record. `DECISIONS.md` #7 narrows
  "seeds are never uploaded" to keep covering the seeded opportunities and problems, which are
  reference data for the method.
- **A country that can be counted.** Two letters, with the source's own wording kept beside it.
- **Money with a unit and a footing.** `currency` and `basis` are added; the figure itself stays
  verbatim.
- **`/companies` becomes readable**: counts by country and kind, and the money split into two tables —
  what employers pay, and what vendors charge.
- **Explicitly not:** any total, average or index over the money, and any chart that puts a salary and
  a licence on one axis. Two tables, never one chart.
- Not in this change: the engine that collects companies, and making the page read from the database.

## Capabilities

### New Capabilities

- `company-records` — what a company record holds, what its figure is allowed to mean, and the
  difference between counting and adding.

### Modified Capabilities

None. `openspec/specs/` is still empty; `problem-analysis` is in flight in another change.

## Decisions

**`country` is a code and `location` is free text, both kept.** Grouping on free text is how a
location overview becomes a chart of ones — "UK", "United Kingdom" and "London, UK" are three rows.
Normalising loses the original wording, so both are stored and only the code is grouped on.

**No `money kind` column.** `kind` already decides what `amount` means: `employer` pays a salary,
`vendor` charges for software, `bespoke` charges for the work by hand. A second column saying the same
thing is a second column that can disagree.

**The figures are never parsed.** One is a range, one is per user rather than per year, one is a share
of AUM, and one is "one bespoke build". A numeric column would force a unit onto values that do not
share one, and a chart would then compare a salary in pounds with a licence in dollars. The
constraints enforce the readable half of this (a currency or a basis with no amount is rejected);
no constraint can enforce the half that matters, so it is a rule here and a test in the code.

## Impact

- A migration adding `country`, `currency` and `basis` to `companies`, and renaming `number` to
  `amount` and `number_label` to `amount_note`. Additive; the table is empty.
- `lib/problems.ts`: the `Company` type and its 21 rows.
- `app/companies/page.tsx`: rebuilt as counts and two money tables.
- `scripts/load-companies.js` and a `pnpm load:companies` script, reading the model rather than
  repeating the rows in SQL so there is one copy of the data.
- The rubric's `competition` dimension gains a source it can actually cite once the load is run, which
  is what `problem-analysis` was missing.
