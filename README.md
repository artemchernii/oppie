# oppie.lab

The first tangible MVP for the Business Idea Session: a small evidence-first opportunity research board.

## Minimal model

Each opportunity has:

- thesis and category
- stage (`discovery`, `investigate`, `validate`, `build`, `pause`, `kill`)
- evidence status (`early`, `mixed`, `crowded`)
- evidence / unknowns
- build estimate and pricing hypothesis
- kill reason and next test
- YC, Reddit, and company source links

Stages are separate from evidence status on purpose: where the work sits in the pipeline is
not the same question as how strong the evidence is. No field is ever scored.

## Where the data lives

Opportunities persist in this browser only, under the `oppie.lab.opportunities` localStorage
key. There is no backend, account, or sync. The six seeded candidates load on a fresh profile;
"Reset to seed" in the footer restores them and discards local edits.

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Checks

```bash
pnpm test    # persistence rules (storage recovery, round trip, id allocation)
pnpm build   # production build, includes typechecking
```

`pnpm test` needs no test framework — it compiles `lib/persistence.ts` to `.tmp-test/` and runs
plain Node assertions against it. CI runs both checks on every pull request.

## Workflow

`master` is protected: nothing is committed or pushed to it directly. Every change goes through a
feature branch and a pull request, squash-merged after CI passes. Commit messages and PR titles
follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by a `commit-msg`
hook locally and a CI check on the server.

See `AGENTS.md` for the full working agreement — branch naming, commit format, product
invariants, and what must be true before a PR is ready.
