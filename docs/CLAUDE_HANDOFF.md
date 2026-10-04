# oppie.lab — Claude handoff

- Date: 2026-10-04
- Branch: `master` at `1288b2a` (everything below is merged; no open PRs from this work)
- Next task: **check NIS2 demand from the buyer side** (section 5)

## 1. Read first

1. `AGENTS.md` — working agreement. Never commit to `master`; branch → PR → squash-merge on green CI.
   PR titles are Conventional Commits. Every reply ends with the five-line footer (§10).
2. `STATUS.md` — the runs table under "Runs so far" holds every discovery result to date.
3. `docs/PRODUCT_DIRECTION.md` — direction-first discovery; the engine suggests, a person decides.

## 2. What the product does now (plain)

You type a direction. **Run discovery** fetches real sources in three lanes — **pain** (Reddit via
Brave search, Hacker News), **businesses** already selling a fix with their prices (Brave), **money**
(Remotive job posts). A language model then splits the run into distinct pains, each with the
businesses selling a fix. Code checks every claim: quotes must appear word for word in a stored
source, businesses must come from the business lane, prices only if quoted. Everything else is
dropped and counted. Each surviving pain waits in `/inbox` until a person accepts (reason + chosen
sources → a Problem) or rejects (reason). Nothing is accepted, scored or concluded automatically.

## 3. Tools

| Command | What it does | Writes? |
|---|---|---|
| `pnpm discover:dry "direction"` | collect and print real results | no |
| `pnpm discover:run "direction"` | collect, split into pains, store (secret key, admin path) | adds rows |
| `pnpm discover:split <run-id> [--save] [--from file.json]` | split an existing run; `--from` checks a split written elsewhere | with `--save` |
| `pnpm test` / `pnpm build` / `pnpm test:e2e` | unit (59 discovery assertions), build, 13 Playwright tests on port 3110 | no |

- Run `pnpm build` before pushing anything under `lib/` — the app type-checks against **ES5**
  (`tsconfig` target), which rejects regex literals with the `u` flag. Unit tests compile ES2020 and
  will not catch it (cost a failed CI on #56).
- Keys in `.env.local` (gitignored): `BRAVE_API_KEY`, `AI_GATEWAY_API_KEY`, Supabase. Vercel has
  `BRAVE_API_KEY` for Production and Preview; the deployed app authenticates to AI Gateway with OIDC.
- Model: `google/gemini-2.5-flash` on AI Gateway's **free tier** ($5/month free credit, ~$0.006 per
  split, ~780 splits/month). Claude models need paid credits; set `AI_GATEWAY_MODEL` to switch.
- Python on this Mac has no SSL certificates — use Node (`node -e` with `fetch`) for ad-hoc API calls.

## 4. Data state (live Supabase, 2026-10-04)

- 24 runs, 693 sources (all untriaged), 84 proposals waiting, 0 decided by the owner yet.
- 5 waiting proposals are old-style combined ones ("Review repeated work around …") — superseded by
  the splits; the owner may reject them.
- Two off-topic job sources ("Senior Shopify Developer", "Inside Sales Contractor") sit in the
  service runs, untriaged, waiting for the owner to discard.

### What the runs found (detail in `STATUS.md`)

- Repeated pattern: a real pain → cheap software already exists → crowded. The openings are human
  services in the price gap, or narrow regulation-driven slices.
- Strongest candidate so far: **NIS2 evidence for small suppliers**. Large EU companies must check
  their suppliers' security; small suppliers get pulled in. Supply is thin: one fixed-price package
  found (GreenOnion, Austria, 1,900–3,900 EUR); next tiers are a 4,500 EUR gap assessment and
  15,000 EUR+ consultancy; questionnaire software starts at $9,600/year. **Demand evidence is weak**
  (~4 sources) — complaints are not proof anyone pays (`docs/RULES.md`, the paid-today test).

## 5. Next task: NIS2 demand from the buyer side

Question: are large EU companies actually sending NIS2 security requirements to small suppliers,
and how many? Supply exists; demand is the open question.

What counts as evidence (stronger first):
1. Published supplier security requirements, supplier codes of conduct or procurement terms from
   named large EU companies that cite NIS2 or demand supplier security evidence.
2. Tenders and RFPs that require NIS2-aligned security evidence from bidders.
3. Job posts for third-party-risk / supplier-security roles at large EU firms that mention NIS2
   (a salary is a budget signal; check the job is on-topic).
4. Supplier-side reports of receiving these questionnaires (forums, Reddit) — weakest; it is pain,
   not payment.

Suggested runs (use `discover:run`; check with `discover:dry` first if unsure):
- `"supplier security requirements NIS2 large companies"`
- `"NIS2 Lieferantenanforderungen Informationssicherheit Lieferanten"` (German)
- `"third-party risk management NIS2 supplier questionnaire"`
- `"NIS2 supply chain security clause supplier contract"`

Also try direct Brave searches for named companies' supplier portals and "supplier code of conduct
NIS2". Record results in the `STATUS.md` runs table through a docs PR, and say plainly whether the
demand evidence is strong, weak, or absent — with the numbers.

Known limits to keep in mind:
- The pain filter is English-only; non-English pain is labelled `context`.
- Prices written as commissions ("7–30%") or in złoty are not recognised as prices.
- On German text the free model miscopies quotes; the checker drops them (14 on one run). A paid
  model would likely keep more; do not loosen the checker.

## 6. Owner preferences

- Plain explanation first, precise second (`AGENTS.md` §9). The owner is tired of "no code"
  answers and wants real data; show results, not plans.
- Continuation prompt is one short line; do not restate rules or the footer format.
- Cover UI changes with Playwright tests; check light and dark themes.
- Ask before spending money or changing spend settings; never enter keys or payment details.

## Copy-paste prompt

```text
Continue oppie.lab: check NIS2 demand from the buyer side (docs/CLAUDE_HANDOFF.md §5).
```
