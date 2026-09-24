# oppie.lab — MVP specification

## Purpose

oppie.lab is a readable research workspace for finding and validating businesses worth building, buying, or adapting.

The MVP should help Artem answer one question:

> Which opportunities deserve the next small validation step — and which should we kill?

It is not a prediction engine and it must not hide uncertainty behind a score.

## Core loop

1. Add or import an opportunity.
2. Capture the business thesis in one sentence.
3. Attach evidence from YC, Reddit, company sites, pricing pages, reviews, jobs, acquisitions, or regulation.
4. Record what is known and what is still unknown.
5. Estimate a simple build/price model.
6. Write a mandatory reason this might fail.
7. Choose the cheapest next test.
8. Move the opportunity to `investigate`, `validate`, `pause`, or `kill`.

## MVP screens

### Opportunity board

- compact cards and table view
- search and status filters
- evidence status: `early`, `mixed`, `crowded`
- build estimate and pricing hypothesis
- source count
- no overall opportunity score

### Opportunity detail

- thesis and category
- what we know
- what we do not know yet
- evidence/source list with links
- economics assumptions
- kill reason
- next test
- current stage/status

### Editing and persistence

The next implementation slice should add local persistence and editing for one opportunity at a time. Authentication, collaboration, billing, and a backend API are out of scope until the workflow proves useful.

## Minimal data model

```text
Opportunity
  id
  title
  category
  thesis
  stage: discovery | investigate | validate | build | pause | kill
  evidenceStatus: early | mixed | crowded
  evidenceSummary
  unknowns
  buildEstimate
  pricingHypothesis
  killReason
  nextTest
  tags[]
  sources[]
  createdAt
  updatedAt

Source
  id
  type: YC | Reddit | Company | Pricing | Review | Job | Regulation | Acquisition | Other
  label
  url
  note
  confidence: strong | moderate | weak
```

## Acceptance criteria

- A user can scan all candidates without opening a long report.
- A user can tell evidence, assumptions, and unknowns apart.
- Every opportunity has a visible kill reason and next test.
- Source links are one click away.
- Search, filtering, and detail view work without a page reload.
- The UI never presents an invented numeric score as a conclusion.
- The seed data contains the six Business Idea Session candidates.

## Out of scope

- authentication and teams
- automated web crawling
- AI-generated conclusions
- billing
- notifications
- complex financial modelling
- choosing a final business automatically
