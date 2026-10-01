# Research questions

The standing queue of what to look for, per problem, and which gate each question would
clear. This is the file the engine reads from, and the file that keeps a research session
from drifting into whatever looks interesting.

## How a pass works

```text
1. pick the questions to answer        ← this file
2. run the searches, collect sources   ← the assistant, or any provider with a key configured
3. drop the batch into a JSON file
4. pnpm research batch.json            ← dedupes, appends to research/inbox.json
5. open /inbox and triage              ← attach as evidence, or discard. You decide.
6. accept or reject the suggested answers, or edit them first
```

Step 2 is the only one that needs a search provider. No key is configured in this repo, so
that step is done by hand or by an assistant; `scripts/research.js` deliberately does not
search. Steps 4 to 6 are mechanical and are automated.

**The rule this pipeline protects.** The engine may collect and may suggest. It may not
conclude. A suggestion reaches a record only when a person clicks Accept, and when they do,
the reason and the source are written into the record alongside the number.

## Batch format

```json
[
  {
    "url": "https://example.com/pricing",
    "title": "Example — published price list",
    "finding": "$5,000/yr under $25M AUM. Quoted verbatim, not summarised.",
    "foundFor": "portfolio reporting software pricing",
    "suggests": "P-001"
  }
]
```

`finding` should carry the number or the quote itself, so a human can judge it without
re-fetching the page. An empty `finding` is honest; an invented one is not.

## Queue

### P-001 · broker files from several sources do not fit together — **G3, want G4**

| Question | Would clear |
|---|---|
| Who owns this at a 20–200 person firm, and can they sign without procurement? | G4 |
| Does anything sell custodian-file ingestion on its own, at a price? | moat |
| What does one client pack actually cost in staff hours, quoted by a firm rather than a vendor? | pay |

### P-006 · trades, settlements and collateral across back-office systems — **G2, want G4**

| Question | Would clear |
|---|---|
| Does a middle-office team of this size buy tooling, or only hire? | G4 |
| Is CASS reconciliation work ever outsourced to a small provider? | path |

### P-003 · statements, records and internal books disagree — **G2**

| Question | Would clear |
|---|---|
| Which exceptions repeat monthly, and who is paid to resolve them? | pain |
| Do small accounting firms buy reconciliation tooling, or hire juniors? | pay |

### P-007 · a client report needs a pack assembled by hand — **G1, evidence gathered**

| Question | Would clear |
|---|---|
| Is the buyer the advisor or an operations lead? | G4 |
| Would anyone pay for assembly alone, without the reporting tool? | pay |

### P-009 · small firms need repeatable data review — **G1, evidence gathered**

| Question | Would clear |
|---|---|
| Bank reconciliation is well evidenced. Does the same firm have a *portfolio data* problem? | G1 |
| What price separates "the spreadsheet is fine" from "we need help"? | pay |

### P-010 · audit evidence is spread across systems — **G1, looks crowded**

| Question | Would clear |
|---|---|
| Is there any segment these cheap transparent tools do not serve? | moat |

### P-008 · reconciliation depends on one person's memory — **G1**

| Question | Would clear |
|---|---|
| Has anyone ever bought something for key-person risk before an incident, rather than after? | pay |

### P-002 · P-004 · P-005 — buyer and price questions

| Question | Would clear |
|---|---|
| P-002: is there a company buyer, or is this only retail? | G4 |
| P-004: do family offices buy at $12–24k/yr for private-asset reporting specifically? | pay |
| P-005: GIPS is priced from $3,960/yr — is there room above the cheapest published option? | moat |

## Kill conditions

Kill or park a problem when:

- nobody pays for the workflow today;
- the workaround is fast and good enough;
- the buyer is reachable only through a network that does not exist;
- the work needs a licence, custody of funds, or regulated advice;
- the buyer needs enterprise procurement before a small test is possible;
- the only evidence is that other founders think the idea sounds useful.
