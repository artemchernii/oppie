# oppie.lab — Claude handoff

- Date: 2026-10-04
- Branch: `master` at `45ef7d6`; the supplier-side results are on `docs/nis2-supplier-paid-today`
- Next task: **owner decision on the NIS2 candidate** (section 5) — desk research is exhausted

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

- 30 runs, 829 sources (all untriaged), 95 proposals waiting, 0 decided by the owner yet.
- The 4 buyer-side runs (2026-10-04) added 100 sources and 9 vendor-described pains; the buyer
  documents below came from direct searches and are recorded in `STATUS.md`, not stored as sources.
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
  15,000 EUR+ consultancy; questionnaire software starts at $9,600/year.
- Buyer side (2026-10-04): **real but weak**. 5 of 9 companies whose supplier documents were read publish
  security demands (RWE terms with termination for false answers; Diehl Defence and Baumann name
  NIS2). The Netherlands has a model NIS2 purchase-terms addendum from Nevi + VNO-NCW. Germany has
  ~29,500 entities in scope (17,945 registered). No proof yet that a small supplier pays to answer;
  buyers often accept a free self-assessment instead — a kill-reason candidate.
- Supplier side (2026-10-04): **paid-today test not passed.** Sellers price it (Wermescher 2,990 EUR
  fixed, GreenOnion 1,900–3,900 EUR, fraghugo bundled from 79 €/month, NIS2 Pilot 49.99 €, Fiverr
  $40–$200) but no named supplier who paid was found, and FitNIS2 offers it free (BMWE-funded).

## 5. Next task: owner decision on NIS2

Desk research on NIS2 is done: buyers demand evidence (real, weak), sellers price help (2,990 EUR
down to free), no proof any small supplier paid. The next evidence cannot come from search. The
owner picks one:

1. **Kill or park NIS2** with the reason "free and near-free fixes exist; no proof of payment" and
   return to the inbox (95 proposals, 0 decided).
2. **Real-world test**: ask 5–10 small suppliers to energy, health or industry customers whether
   they received a NIS2 questionnaire and whether they paid anyone to answer it. The owner does the
   outreach; the agent can draft the questions and a log in `docs/`.
3. **Pricing test**: a one-page offer at a fixed price, measured by replies. Needs spend and a
   `DECISIONS.md` entry before anything is built.

Until the owner decides, the agent should not start new NIS2 runs.

## 6. Owner preferences

- Plain explanation first, precise second (`AGENTS.md` §9). The owner is tired of "no code"
  answers and wants real data; show results, not plans.
- Continuation prompt is one short line; do not restate rules or the footer format.
- Cover UI changes with Playwright tests; check light and dark themes.
- Ask before spending money or changing spend settings; never enter keys or payment details.

## Copy-paste prompt

```text
Continue oppie.lab: act on my NIS2 decision (docs/CLAUDE_HANDOFF.md §5).
```
