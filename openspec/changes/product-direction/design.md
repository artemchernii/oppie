# Design

## Product shape

The product has two stages.

### Stage 1 — discovery

The user enters any combination of:

- market or industry;
- geography;
- buyer or role;
- workflow area;
- constraints such as “solo founder”, “service first” or “under €10k to test”;
- a loose natural-language prompt.

The engine returns a discovery board. Each candidate contains:

- a plain-language problem statement;
- the concrete workflow behind it;
- who performs the work;
- who pays or employs the person doing it;
- evidence that the work is real and repeated;
- existing businesses, vendors or service providers;
- prices, salaries or contract values quoted verbatim;
- possible paths: copy the model, adapt it to another segment, or build a new product;
- unknowns and the next research question.

Candidates are proposals. They are not yet user-owned problem records.

### Stage 2 — acceptance and validation

The user accepts a candidate into the problem workspace. Only then do the existing gates, rubric,
ratings, interviews and hand-run tests apply.

## Discovery engine

```text
direction / prompt
        |
        v
query plan by source class
        |
        v
sources -> dedupe -> extract quotes, figures, dates, actors and workflows
        |
        v
cluster repeated work and money signals
        |
        +--> candidate problem
        |
        +--> existing business / vendor pattern
        |
        v
human accepts, rejects or asks for more evidence
        |
        v
tracked Problem + linked business evidence
```

The engine should search different source classes for different facts:

| Source class | What it can establish |
|---|---|
| Job postings | A company pays for a role and the posting often describes the workaround |
| Procurement and tenders | A buyer formally requested the work or capability |
| Vendor pricing pages | A business model and price are already accepted somewhere |
| Service providers and agencies | Work is already sold manually and may be productisable |
| Reviews and communities | Pain language, workaround and incumbent weaknesses |
| Regulation and deadlines | A recurring trigger that forces the work |
| Company pages and filings | Who operates in the space and what segment they serve |

No source class answers every question. A community complaint can establish pain language but cannot
establish paid today. A pricing page can establish a price but not that the user's target segment
will buy it.

## Candidate business patterns

A business pattern is not a recommendation. It is a compact description of something already being
done:

- customer segment;
- painful workflow;
- offer or service;
- buyer;
- pricing basis and verbatim figure;
- distribution or acquisition path if sourced;
- evidence URLs and quotes;
- what appears copyable, what appears differentiated, and what is unknown.

The words “copy” and “adapt” describe a research direction, not permission to copy protected code,
brand, content, trade secrets or other protected material.

## Human boundary

The engine may propose a candidate problem and business pattern. It must not silently create a
tracked record, assign a gate, mark a dimension yes, or announce that the business is viable.

Acceptance stores the candidate's reason and source bundle. Rejection is also useful: it should
record why the candidate was discarded so the same weak pattern is not repeatedly surfaced.

## First implementation sequence

1. Define the discovery input and candidate shapes without adding a second source of truth.
2. Build an on-demand collector for one source class, preferably procurement or job postings.
3. Extract one citation per source and keep the raw source separate from the candidate summary.
4. Cluster sources by workflow, not merely by keyword or URL.
5. Show candidate problems and business patterns in a review queue.
6. Add accept/reject/deepen actions with reasons.
7. Feed accepted candidates into the existing Problem record and validation loop.
