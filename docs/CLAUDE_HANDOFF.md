# oppie.lab — Claude handoff

- Date: 2026-10-04
- Branch: `master` at `24ea033`; Ideas board on `feat/ideas-board`
- Next task: **Pursue creates a tracked problem** (section 5), after the owner applies the migration

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

- 36 runs, 1,008 sources (all untriaged), 112 proposals waiting, 0 decided by the owner yet.
- The owner's edge (saved in agent memory): English, Ukrainian, Russian; EU (Portuguese) passport;
  frontend developer; likes finance, people, marketing, Asia. Aim at markets with money (UK, US,
  Korea, China), never Portugal; no freelancing.
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

## 5. Next task: Pursue creates a tracked problem

The home page is the Ideas board (`DECISIONS.md` #10, spec in
`docs/superpowers/specs/2026-10-04-ideas-board-design.md`). The owner decides each idea with
Pursue / Park / Drop and a reason. Decisions need `idea_decisions`, which the owner applies by
pasting `supabase/migrations/20261008000000_idea_decisions.sql` into the Supabase SQL editor.

Next build: when the owner picks **Pursue**, offer to create a tracked problem from the idea,
reusing the inbox acceptance path (reason + chosen sources). Do not create anything on load.

Also open, smaller:
- Inbox: 829 raw sources render before the 95 proposals (page ~430,000px tall). Put proposals
  first and group them by idea.
- The businesses found by searches are stored only as text in `business_pattern`; `companies`
  still holds the 21 seed companies.
- `AGENTS.md` § 4 names `scripts/persistence.test.js`, which `pnpm test` does not run.

Do not run `pnpm build` while the dev server is running: both write `.next` and the dev server
loses its CSS. Stop it, `rm -rf .next`, restart.

## 6. Owner preferences

- Plain explanation first, precise second (`AGENTS.md` §9). The owner is tired of "no code"
  answers and wants real data; show results, not plans.
- Continuation prompt is one short line; do not restate rules or the footer format.
- Cover UI changes with Playwright tests; check light and dark themes.
- Ask before spending money or changing spend settings; never enter keys or payment details.

## Copy-paste prompt

```text
Continue oppie.lab: Pursue creates a tracked problem (docs/CLAUDE_HANDOFF.md §5).
```
