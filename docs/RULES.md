# oppie.lab — research rules

These rules exist to stop oppie.lab from becoming another optimistic wall-of-text generator.

## 1. Evidence before enthusiasm

Never call an opportunity promising because the idea sounds good. Separate:

- `Observed` — directly supported by a source or conversation.
- `Inferred` — a reasonable interpretation of observed evidence.
- `Unknown` — not checked yet.
- `Assumption` — required for the economics to work but unvalidated.

The UI should make these categories visible.

## 2. Competition is evidence, not just a threat

Existing companies can prove that customers pay, but they can also kill a generic version of the idea.

Always ask:

- How many relevant companies already exist?
- What do they sell and charge?
- Is there evidence of customers or traction?
- Is our proposed wedge specific enough to matter?

YC is a recurring discovery and competition source, not a badge of approval.

## 3. Generic ideas are presumed weak

The default version of a broad category is not investable. Require a concrete wedge:

```text
specific customer + specific workflow + specific geography/vertical + specific outcome
```

Examples:

- not “AI for home services”
- possibly “back office for Portuguese HVAC companies”

## 4. Every card needs a kill reason

The kill reason must name the strongest reason not to build the opportunity today. “Needs more research” is not enough.

Good kill reasons mention crowding, trust, regulation, distribution, switching cost, low willingness to pay, or bad economics.

## 5. A score is a judgement with its inputs showing

A number that hides how it was made is forbidden. So is any figure that presents itself as a
measurement of a market, a probability of success, or a forecast. `83/100` handed down as a verdict
on a business is exactly that, and it stays banned.

A **score is allowed**, and is how the board ranks. Four conditions:

- its dimensions and weights are stated in one place, written down, and visible next to the number;
- every dimension's contribution, and the citation behind it, is reachable from the number;
- it states how many dimensions it was computed over, and a blank never counts as zero;
- it is labelled as this system's judgement, never as a measurement.

Weights are still invented. That is acceptable precisely because they are written down and
overridable — an invented weight you can see is a position you can argue with, and one you cannot
see is a claim you cannot check. What no weight fixes is summing quantities that are not on one
scale: weeks against euros against ordinal severity stays meaningless, and `Pain ×2 + Market ×3` is
only coherent where both inputs are the same kind of quantity.

A person's own rating, stored beside the machine's and against the version of the rubric that
produced it, is what keeps the rubric honest.

An **ordering by cited facts** remains available and is the default, per `docs/PAIN_FUNNEL.md`
§ Ordering: furthest gate passed, then a cited yes/no on pain severity, then the largest already-paid
amount. Nothing in that order that is not a quote, a date, and a URL. Records are never ordered
before they have passed every gate.

Use evidence statuses and plain-language conclusions:

- `Early` — an interesting signal, not enough evidence.
- `Mixed` — real evidence plus material unknowns.
- `Crowded` — demand may be real, but the generic version is already heavily attacked.

`0` and blank are different things: `0` is checked and zero, blank is not checked and renders
`Not added yet`.

Economics must show assumptions, not pretend to be a forecast.

## 6. Smallest useful next test

Every opportunity ends with a test that can be run cheaply and quickly, usually interviews, a landing page, a paid pilot, a manual service, or a focused competitor/geography check.

The test must state what result would change our mind.

## 7. Research stages

```text
Discovery → Evidence filter → Deep investigation → Real-world validation → Build
100+          20 survive       5 survive             2 survive              1
```

The six current candidates are test cases for the method, not six businesses we must choose from.

## 8. Output format

Default output is a compact card/table. Use a long dossier only when explicitly requested or when a decision cannot be made from the compact view.

Every research item should fit this shape:

```text
What it is · Who pays · Evidence · Unknowns · Competition · Economics
Why not build · Cheapest test · Sources · Current status
```

## 9. Capital and target context

Use this operating envelope unless changed:

- capital: €20,000
- time: 20–30 hours/week initially; full-time after proof of profitability
- target: €10,000 net/month
- risk tolerance: high
- geography: global, with European/local adaptation worth investigating
- business type: software, service, acquisition, or hybrid are all allowed

## 10. Current known lessons

- Generic home-service AI is highly crowded; kill the generic version.
- Generic AR/collections is already attacked by serious companies; investigate only a narrow wedge.
- Generic construction compliance has real pain but significant competition; require country + niche + managed-service differentiation.
- Generic NIS2 SaaS is crowded; investigate only a specific underserved segment.
- Vertical AI operators are more interesting than general AI consulting.
- Proven business model → new geography/vertical is a core oppie.lab research mode.
- Operating a service and progressively automating it may be more viable than selling horizontal SaaS.

## 11. The paid-today test
The strongest filter between a real problem and a nice-to-have:

> **Is money or headcount already going at this workflow?**

Counts as evidence:

- a job posting whose description **is** the workflow — the salary is the price already being paid;
- an existing paid tool at a published price, bought by firms in this segment;
- a contractor invoice, or an internal headcount;
- a budget line someone will name out loud.

Does not count: complaints, upvotes, "would you use this", or another founder's enthusiasm.

A problem that nobody pays for today does not advance. It is parked or killed with the reason
recorded, per `docs/PAIN_FUNNEL.md` § G2.

## 12. Collect freely, conclude never

The research pipeline has three parts, and the middle one is where the line sits:

```text
collect   →   suggest   →   decide
anyone        the engine    a person, always
```

**Collecting** has no rules worth stating beyond dedupe and honesty: a source is a URL, a query
that found it, and the passage or figure that made it worth keeping. Quote the number, do not
paraphrase it.

**Suggesting** is allowed, and is the reason the pipeline exists. A suggestion is a value for one of
the five questions, with its reason, and with the source it came from. It carries no authority. It
is stored as `proposed`.

**Deciding** is a human action, and the only way a suggestion enters a record. Acceptance writes
three things together — the value, the reason, and the source — so an accepted number can always be
traced back to what produced it. A suggestion with no reason is rejected outright: a bare number is
exactly what this rule exists to prevent.

Two consequences worth stating plainly:

- **Nothing applies itself.** Not on load, not on ingest, not on a schedule, not in bulk. If a
  mechanism could turn a suggestion into a record without a click, it is a violation.
- **Untriaged material is not evidence.** The inbox counts in no total anywhere in the app, and a
  source attached to no problem appears on no problem.
