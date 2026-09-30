# oppie.lab — pain-to-business funnel

oppie.lab should start with problems, not startup ideas.

The purpose of the funnel is to move from a vague pain signal to a specific problem worth testing, while making it easy to kill weak ideas early.

## Funnel

```text
Raw signal
  ↓
Specific problem
  ↓
Repeated behaviour
  ↓
Business consequence
  ↓
Identifiable buyer
  ↓
Manual/service test
  ↓
Buildable solution
  ↓
Validated business
```

An item can move forward only when the evidence for the current stage exists. No numeric score is required.

## Stages and gates

### 1. Raw signal

Something observed in a discussion, job posting, review, company workflow, regulation, or personal experience.

Required: source link and a one-sentence signal.

### 2. Specific problem

The signal is rewritten as a concrete workflow problem.

Bad: “Finance is inefficient.”

Good: “An advisor manually reconciles client holdings across three broker exports before producing a quarterly report.”

Required: who, what they do, and where it breaks.

### 3. Repeated behaviour

At least three independent people or teams describe the same behaviour, or one buyer shows a recurring internal workflow.

Required: observed frequency and current workaround.

### 4. Business consequence

The problem causes a measurable or clearly costly consequence: staff time, delayed reporting, errors, risk, missed money, or inability to serve more clients.

Required: consequence and who bears it.

### 5. Identifiable buyer

We can name the person or role that owns the problem and has a reason to pay.

Required: buyer role, reachable segment, and why they have budget.

### 6. Manual/service test

Test the outcome manually before building software.

Examples: reconcile one client pack, clean one month of broker exports, produce one exception report.

Required: test, time limit, cost limit, and result that would change our mind.

### 7. Buildable solution

Only now define the smallest software or service that makes the tested workflow faster, safer, or repeatable.

Required: narrow workflow, input, output, and explicit non-goals.

## Decision states

- `new` — raw signal, not investigated
- `evidence` — sources exist, problem not repeated yet
- `repeated` — behaviour appears across multiple cases
- `buyer-known` — buyer and consequence are clear
- `testing` — manual/service test underway
- `build` — test evidence supports a narrow product
- `killed` — evidence says stop
- `parked` — interesting, but not current priority

These are states, not scores or rankings.

## Problem record

```text
Problem
  id
  title
  status
  domain
  affectedRole
  problemStatement
  currentWorkaround
  frequency
  businessConsequence
  buyer
  whyTheyPay
  skillFit
  evidence[]
  unknowns[]
  killReason
  nextTest
  createdAt
  updatedAt

Evidence
  type: conversation | reddit | job | company | pricing | review | regulation | personal
  quoteOrObservation
  sourceUrl
  sourceDate
  confidence: direct | reported | inferred
```

## Research scope for the first pass

Focus on problems adjacent to Artem's real skills and context:

- finance operations
- investing and portfolio data
- reconciliation and exception handling
- reporting and evidence packs
- multi-currency and multi-account workflows
- treasury and settlement operations
- compliance administration where no licence is required
- organization-heavy work that currently lives in spreadsheets, PDFs, email, and screenshots

The initial list is a search queue, not a shortlist of businesses.
