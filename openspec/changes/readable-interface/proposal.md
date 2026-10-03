## Why

The owner's words: *"everything is bland and confusing. Not helpful."*

That is not a taste complaint, and it has a specific cause. **`lib/analysis.ts` computes a score, seven
citations and a blocking dimension for every problem, and no screen calls it.** The whole ranking effort
of the last week is invisible. A list row renders an id, a title, one line of prose, a gate chip and a
readiness number, with nothing saying which of those matters or what to do next.

The three questions a person actually opens the app with are spread across three screens with nothing
connecting them in the order they are asked:

1. **What should I look at?** — `/`
2. **Why is it good or bad?** — `/problems/[id]`
3. **Who else is already there, and what do they charge?** — `/companies`

Each screen also stands alone. A problem names companies and does not link to them. A company belongs to
problems and does not say which. Facts are reachable only if you already know where they live.

## What Changes

- **Three reading paths, in order**, each reachable from the one before, with a way back.
- **The judgement on the row, not behind a click**: the score, how many dimensions it was computed over,
  and the dimension blocking the record appear on every problem in a list.
- **Colour that maps to a stated state**, and never carries a meaning on its own — so the screen still
  works in monochrome and for a reader who cannot separate red from green.
- **The ranking stated on screen**: which order the list is in, and why, with both orders available.
- **Cross-links both ways** between a problem and the companies attached to it.
- **Statistics that are counts**, and charts whose length is a count of records or a figure quoted
  verbatim. Same rule as `company-records`; it is referenced there, not restated here.
- Not in this change: the engine, the data model, and the legacy board, which is retiring
  (`DECISIONS.md` #5).

## Capabilities

### New Capabilities

- `reading-paths` — the order a person reads the app in, what each screen must say without being asked,
  and the rules that keep colour and numbers honest.

### Modified Capabilities

None. The surfaces this constrains are being built by `problem-analysis-rubric` tasks 3 and 4 and by
`company-records`; this change states the rules those surfaces must satisfy rather than describing them a
second time.

## Decisions

**This is deliberately not a restyle.** "Add colour and charts" is the request, and taken literally it
produces decoration over a screen that still does not say what to do. The requirements below are about
making the judgement that already exists legible, and a chart is only allowed where its length is a count.

**Colour is required to be redundant.** Every state it encodes also has to read as text or shape. This is
not only an accessibility rule: it is what stops colour becoming the place a meaning hides.

**The score is shown with its base, everywhere it appears.** A score is a proportion over the dimensions
that were checked, so `9/10` beside `checked 6 of 7` is a different claim from `9/10` beside `checked 7 of
7`. A surface showing one without the other is showing a number that cannot be read.

## Impact

- `app/ProblemsList.tsx` — rows gain the score, the base and the blocking dimension.
- `app/ProblemDetail.tsx` — the analysis panel, and links out to the companies.
- `app/companies/page.tsx` — links back to the problems a company is attached to.
- `app/ui.tsx` and `app/globals.css` — the state colours and the shared pieces.
- No data change. No new dependency: the charts allowed here are counts rendered as lengths, which is
  CSS, and a charting library would be a second opinion about what a number means.
