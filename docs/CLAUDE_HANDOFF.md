# oppie.lab — Claude handoff

- Date: 2026-10-04
- Branch: `master` at `c400a5c`; the buyer-side results are on `docs/nis2-buyer-side-demand`
- Next task: **supplier-side paid-today test for NIS2 evidence** (section 5)

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

- 28 runs, 793 sources (all untriaged), 93 proposals waiting, 0 decided by the owner yet.
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

## 5. Next task: supplier-side paid-today test for NIS2 evidence

Question: does a small supplier **already pay** someone to answer a customer's NIS2 / security
evidence request? Buyers demanding it is now shown (`STATUS.md`, "NIS2 buyer-side demand"); money
moving on the supplier side is not.

What counts as evidence (stronger first):
1. A published price for answering customer security questionnaires or producing supplier
   evidence for a small firm (MSPs, consultants, "Lieferantenfragebogen ausfüllen" services).
2. Named customers or case studies of fixed-price packages (GreenOnion and similar).
3. Freelance gigs (Upwork, Fiverr, Malt) for completing security questionnaires, with prices.
4. Job posts at small suppliers for someone to handle customer security requirements.

Counter-evidence to look for with equal effort: buyers accepting free self-assessments
(Baumann, Reinhausen, heyco) and suppliers saying they filled the form themselves.

Suggested runs: `"security questionnaire completion service for small suppliers"`,
`"Lieferantenfragebogen Informationssicherheit ausfüllen Dienstleister"`, plus direct Brave
searches for Upwork/Malt gigs. Record in `STATUS.md` and say whether money is moving, with numbers.

## 6. Owner preferences

- Plain explanation first, precise second (`AGENTS.md` §9). The owner is tired of "no code"
  answers and wants real data; show results, not plans.
- Continuation prompt is one short line; do not restate rules or the footer format.
- Cover UI changes with Playwright tests; check light and dark themes.
- Ask before spending money or changing spend settings; never enter keys or payment details.

## Copy-paste prompt

```text
Continue oppie.lab: NIS2 supplier-side paid-today test (docs/CLAUDE_HANDOFF.md §5).
```
