# Decisions

Append-only log. One entry per call that changes the data model, a visible number, or an
invariant. `AGENTS.md` § 7 requires these to be stated rather than buried in a diff, so the
reasoning lives here and the PR body links to it.

Nothing in this file installs anything. An entry marked **Decided, not implemented** means the
decision is made and the code still does the old thing.

---

## 1. Supabase becomes the backing store for records and files

**Date:** 2026-10-01
**Status:** Decided, not implemented. No package is installed, no code reads a Supabase
variable, and `localStorage` is still the only store.
**Decided by:** the owner, in response to the Supabase marketplace onboarding prompt.

### What was decided

Two things move off the browser:

1. **Records.** The opportunities, problems, and research inbox/proposals that live in the three
   `oppie.lab.*` `localStorage` keys move to a Supabase Postgres project.
2. **Files.** Attachments go to Supabase Storage rather than being referenced by URL only.

A Supabase project exists and a Vercel integration is being connected to the `oppie` project.
The project ref and keys are deliberately **not** recorded here: this repository is public and
`.gitignore` already treats `.env*` and `.vercel` as never-committed.

### What this overrides

`AGENTS.md` § 6 ends with:

> Local-only: no backend, auth, accounts, billing, or sync without an explicit decision.

This entry **is** that explicit decision, and it is narrow: **records and files may live in a
remote backend.** It decides nothing about accounts or billing. § 6 needs an amendment stating
that, and the amendment should land in the same PR that first reads a remote value — not before,
so the invariant stays true for as long as it actually is.

The other § 6 invariants are **not** relaxed by this decision. They are the hard part, and the
next section is how they survive contact with a database.

### The shape it should take

**Recommendation: server-only access. Do not install `@supabase/ssr`.**

| | Server-only (recommended) | Browser client |
|---|---|---|
| Packages | `@supabase/supabase-js` only | adds `@supabase/ssr` |
| Identity | the existing `oppie_session` cookie | a Supabase Auth session |
| Key used | secret key, server-side only | publishable key, shipped to browsers |
| RLS | enabled, **no** permissive policy for `anon` | policies keyed on `auth.uid()` |
| New files | one module under `lib/` | `utils/supabase/{client,server,middleware}.ts` + root `middleware.ts` |

All Supabase calls happen in server components and route handlers. The browser never receives a
key that can read a table.

**Why not the prompt as written.** `@supabase/ssr` and its refresh middleware exist to hold a
*Supabase Auth* session in cookies. This app's identity is the `oppie_session` cookie signed by
`lib/auth.ts`, which Supabase cannot see. Installing the middleware would run a second session
system alongside the gate rather than replacing it — two half-gates. The prompt's middleware is
also incomplete as pasted: it defines a helper under `utils/supabase/` but there is no root
`middleware.ts` in this repo, so nothing would ever call it.

If browser-side reads are wanted later, the honest version is: adopt Supabase Auth,
scope RLS to `auth.uid()`, and retire `lib/auth.ts`. That is a separate decision — append a new
entry rather than editing this one.

### RLS is not optional here

The publishable key is public by design and ships to browsers. With RLS off, every table is
world-readable *and* world-writable by anyone who opens devtools — on an app that holds personal
research, in a public repository. So:

- RLS **enabled** on every table, with an explicit deny as the default.
- No permissive policy for `anon`. The browser reaches data only through a route handler that has
  already passed the gate.
- The secret key is server-side only, never prefixed `NEXT_PUBLIC_`, and never logged.
- If RLS is ever left off during local development, that database must not hold real records.

Note the identity problem this creates: RLS policies normally key off `auth.uid()`, and this app
has no Supabase identity. Under the recommended shape that is fine — `anon` gets nothing and the
server holds the secret key — but it does mean the database cannot be queried directly from a
browser console, which is the intended outcome.

### Invariants, and where they land in SQL

`AGENTS.md` § 6 is the specification. These are the constraints that make the database enforce it
rather than trusting the application layer.

| Invariant | Enforcement |
|---|---|
| An unrated source has no confidence rather than a guessed `moderate` | `confidence` is nullable with `check (confidence in ('strong','moderate','weak'))`. No column default — a default would invent a rating nobody gave. |
| A checked zero is not an empty field | `proposals.value` is a nullable `smallint` with `check (value between 0 and 3)`. `0` and `NULL` are different readings and must stay different. |
| A suggestion carrying no reason is rejected at the storage boundary | `check (status <> 'accepted' or (reason <> '' and source_url <> ''))`. Acceptance writes the reason and the source beside the number. |
| Untriaged sources count in no total | `collected_sources.status` in `('new','kept','spent')`, `not null` default `'new'`. No view, column or generated value totals `'new'`. |
| No weighted total, no invented index | No composite score column, stored or generated. The readiness tally exists only in `docs/PAIN_FUNNEL.md` at equal weight, and stays computed, never persisted. |
| Evidence, unknowns, assumptions and kill reasons stay visibly separate | Separate nullable columns, never merged into one "confidence" field, and never defaulted to empty on read. |
| An empty field never renders as a zero | The `normalize*` functions in `lib/persistence.ts` and friends stay the read path: unexpected shapes degrade to "empty", never to a value. Remote rows inherit the same treatment. |
| The six seeded candidates are reference data | Seeds stay in `lib/data.ts` and are never uploaded. The database holds user records only, so a remote row count is not a shortlist length. |

Two of these are worth a test at the storage boundary specifically, because they are the ones a
database will happily violate: an accepted proposal with an empty reason, and a `NULL`
confidence being read back as `'moderate'`.

### Environment variables

**Verified 2026-10-01** against the live project (`vercel env ls`). The integration is installed
as the resource `supabase-oppie` and created sixteen variables in Preview and Production:

| Set | Names |
|---|---|
| Supabase, unprefixed | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` |
| Postgres, unprefixed | `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| Prefixed duplicates | `NEXT_PUBLIC_POSTGRES_DBSUPABASE_URL`, `NEXT_PUBLIC_POSTGRES_DBSUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_POSTGRES_DBSUPABASE_ANON_KEY` |

Three things follow.

**The prefix produced junk.** The custom prefix was `NEXT_PUBLIC_POSTGRES_DB`, so the integration
created a second, prefixed copy of three variables — note there is no underscore between `DB` and
`SUPABASE`. Nothing will ever read those names, and they are not what the onboarding code expects
either.

**The name the onboarding code reads does not exist.** That code reads `NEXT_PUBLIC_SUPABASE_URL`
and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Neither is in the list, so the sample would fail as an
undefined URL at runtime rather than at install time. The fix is not a new variable: point the code
at `SUPABASE_URL`, which already exists.

**All sixteen are marked `Secret`/`Hidden`, including the ones that are not secret.**
`SUPABASE_URL` and the publishable and anon keys ship to browsers by design, so `Sensitive` buys
nothing there — and it costs something real, because `vercel env pull` cannot retrieve a hidden
value, so local development needs those values copied from the Supabase dashboard by hand. Keep
`Secret` on `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, and only those.

The recommended server-only shape needs exactly two of the sixteen: `SUPABASE_URL` and
`SUPABASE_SECRET_KEY`. **Nothing needs to be added in Vercel.** The `POSTGRES_*` set is for an ORM
talking to Postgres directly and is unused until one is added; `SUPABASE_SERVICE_ROLE_KEY` and
`SUPABASE_JWT_SECRET` are the legacy pair that `SUPABASE_SECRET_KEY` supersedes.

### What does not change yet

- `localStorage` stays authoritative. `lib/persistence.ts`, `lib/problemPersistence.ts` and
  `lib/researchPersistence.ts` are unchanged, and a failed remote call must never clear a local
  record. Storage bugs destroy the user's work silently, which is why this is the one area with
  test coverage.
- No packages are installed, no `middleware.ts` is added, and the gate in `lib/auth.ts` is
  untouched.
- The research collector keeps running locally via `scripts/research.js`.
- Nothing applies on load, on ingest, or on a schedule. A remote row is data, not a conclusion.

### Open questions

1. ~~**Is a secret key created by the integration, and under what name?**~~ **Answered**
   2026-10-01: `SUPABASE_SECRET_KEY` exists in Preview and Production. It is the only secret the
   server-only shape needs, alongside `SUPABASE_URL`.
2. ~~**Cutover policy.** Local-first write-through, remote-first, or two-way sync?~~ **Answered**
   2026-10-03 by entry #2 below: remote-first, with `localStorage` kept as an offline cache and
   never read as the source of truth again.
3. ~~**What happens to records already in a browser's `localStorage`** — one-time upload, or
   abandoned at cutover?~~ **Answered** 2026-10-03 by entry #2 below: pushed up once, on the first
   successful load, and only for records that are not untouched seeds. Measured on the first live
   load: nothing was pushed, because the browser held only the seed list.
4. **What is actually stored for attachments?** The source `url` is already recorded with a
   `linkStatus`; a bucket implies real files. Snapshots, downloads, or uploads — undecided.
5. **Multi-device.** The gate is one password, not one account. Concurrent editing from two
   browsers needs a conflict rule before it needs a schema.
6. **Does the collector move server-side?** `BRAVE_API_KEY` currently lives on the machine
   running the script.

---

## 2. Problem records read from the database; the browser keeps a cache

**Date:** 2026-10-03
**Status:** Decided and implemented (PRs #27, #29).
**Decided by:** the owner, answering the cutover question in entry #1.

### What was decided

For the `problems` record type, the database is the source of truth. The page reads as the signed-in
person on the server and passes the list to the client, so the first client render already has the
records and there is no fetch-after-mount. `localStorage` is still written on every change, but it
is an offline cache and is never read as the source of truth again.

What is in a browser already is pushed up **once**, on the first successful load, and only for
records that are not untouched seeds. A failed push is recomputed on the next load, so nothing is
stranded.

### What this resolves

Open questions 2 and 3 of entry #1. It does not answer question 5 (multi-device): with one browser
as the writer, last-write-wins holds and no conflict rule is needed yet.

### A failed read is not an empty table

The read returns `null` for unconfigured, denied or failed, and `[]` only for a genuinely empty
table. `null` shows the browser's own records and uploads nothing. Pushing into a table that could
not be read is how a stale copy overwrites a newer one.

### Consequences

- `resetToSeed` is now local-only. It is not a delete and writes nothing.
- The three problem routes are `force-dynamic`. A prerendered page would be one person's records
  baked into a file.
- `problem_companies` is read but not written, because its foreign key points at `companies`, which
  is still seed-only data. An edited P-001 loses its seven company ids on a browser with no local
  copy. This closes with the companies screen.

---

## 3. The engine analyses; it does not score

**Date:** 2026-10-03
**Status:** Decided. The capability is specified as
`openspec/changes/problem-analysis-rubric/`; nothing is built yet.
**Decided by:** the owner.

### What was decided

The app stops being a place where a person types a problem and reads it back. It becomes an evidence
engine: it collects sources, and it evaluates a problem record against the method's dimensions. The
engine's job is to **find the citation**, not to rate the idea.

`docs/RULES.md` § 5 and `AGENTS.md` § 6 are **not** relaxed. There is no overall score, no weighted
total and no index. What is allowed, and what this entry authorises:

- one verdict per dimension, each carrying the record field or source that decided it;
- a named dimension identified as the one blocking the record;
- counts of records, and figures quoted verbatim with their source.

What stays forbidden: any value computed from two or more dimensions.

### Why the boundary is drawn there

An engine that returns a blended number is unfalsifiable — it will feel productive and settle
nothing. An engine that returns "paid today: yes, cite: this job posting, whose description *is* the
workflow" can be checked in one click, and it is `docs/RULES.md` § 11 read literally. That is the
whole difference between this and an idea generator.

A second, harder reason: the verdict vocabulary is `yes` / `no` / `unknown` rather than the
readiness tally's `0–3`, precisely because `0–3` is summable and `yes` / `no` / `unknown` is not.
The no-composite rule becomes a property of the data rather than something someone has to remember.
The cost is a second scale in the product, accepted deliberately.

### What this overrides

`docs/MVP_SPEC.md` "Out of scope: **automated web crawling**" — the engine may now collect from more
than one search API. Its sibling line, "AI-generated conclusions", is **not** overridden: the engine
offers cited verdicts as suggestions, and a person still decides. `docs/RULES.md` § 12 is unchanged.

### Consequences

- Analysis output is proposal-shaped, so the existing accept-with-reason guard applies unchanged.
- Anything that could put a verdict in a record without a click and a reason is a violation of this
  entry, not an optimisation of it.
- `docs/PAIN_FUNNEL.md` § Ordering may not consume verdicts as weights, tie-breakers or inputs.

### Open

Whether the engine may propose *candidate problems* from raw sources, or only evaluate problems a
person framed. The owner's answer was "evidence and so on", which reads as the latter, but a
clustering step for candidate problems is not ruled out. It needs its own entry, and a new shape to
store a proposed problem in, before any code.

---

## 4. OpenSpec holds the behaviour; the handoffs are retired

**Date:** 2026-10-03
**Status:** Decided and implemented (`openspec/` plus the pi integration in `.pi/`).
**Decided by:** the owner.

### What was decided

OpenSpec is the record of what the software does. `openspec/specs/` holds behaviour that exists now,
written as requirements with scenarios; `openspec/changes/` holds proposed changes, one folder each.
Artifacts are plain Markdown and the tool never touches git, so it fits the existing branch/PR/CI
flow rather than replacing it.

### What it replaces, and what it does not

The point is to remove a drift surface, not add a fifth place for the truth to live:

| Document | Role after this entry |
|---|---|
| `openspec/specs/` | What the software does now. Requirement and scenario form. |
| `openspec/changes/` | What is proposed, and why. |
| `docs/RULES.md` | Research law. Not software behaviour, and not superseded. |
| `docs/PAIN_FUNNEL.md` | The method: gates, axes, the tally, the ordering rule. Not superseded. |
| `docs/MVP_SPEC.md` | Superseded by `openspec/specs/` once the existing screens are captured there. |
| `DECISIONS.md` | The decision log, unchanged. Every entry that changes an invariant belongs here. |
| `docs/handoffs/*.md` | Retired. No new handoff files. |

The three handoff files stay in place until their content is captured, then go. Until then
`HANDOFF_SUPABASE.md` is the accurate description of storage and `STATUS.md` is behind.

### Consequences

- A change to behaviour should land as an OpenSpec change. A PR that changes behaviour without one
  should be rejected in review.
- `@fission-ai/openspec` is a devDependency, so `pnpm exec openspec` is reproducible and can run in
  CI later. It is not part of the build.
- Telemetry defaults to on and reports command names and version only. Disable with
  `openspec config set telemetry.enabled false` or `OPENSPEC_TELEMETRY=0`.

---

## 5. The legacy opportunity board is not repaired

**Date:** 2026-10-03
**Status:** Decided. The page is still shipped and still in the nav; removing it is a separate
change.
**Decided by:** the owner.

### What was decided

`/opportunities` uses 21 CSS classes that no longer exist in `app/globals.css` — `brand`,
`side-label`, `count`, `rule-dot`, `green`, `yellow`, `red`, `sidebar-bottom`, `signal-strip` and
others. It renders as broken markup: "We are still researching" runs into the sentence before it,
the summary counts collapse onto one line, and the search field collapses to a single character.

The cause is not a regression to hunt. Two generations of UI share one stylesheet and one of them
stopped being maintained. It will not be repaired, because it will rot again and because a board is
coming back on the new model.

### What this does not decide

The board itself is wanted. It stays wanted as a view over problems, companies and the figures
attached to them — not as the opportunity card grid. When that board lands, `/opportunities` goes,
and `lib/data.ts` stays untouched: `AGENTS.md` § 6 protects the six seeded candidates as reference
data for the method, not the screen that displays them.

### Consequences

- No CSS work on `/opportunities`. It stays in the nav until its replacement exists.
- The nav label "Legacy board" is honest and stays until then.
