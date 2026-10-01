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
| No weighted total, no invented index | No composite score column, stored or generated. The readiness tally exists only in `PAIN_FUNNEL.md` at equal weight, and stays computed, never persisted. |
| Evidence, unknowns, assumptions and kill reasons stay visibly separate | Separate nullable columns, never merged into one "confidence" field, and never defaulted to empty on read. |
| An empty field never renders as a zero | The `normalize*` functions in `lib/persistence.ts` and friends stay the read path: unexpected shapes degrade to "empty", never to a value. Remote rows inherit the same treatment. |
| The six seeded candidates are reference data | Seeds stay in `lib/data.ts` and are never uploaded. The database holds user records only, so a remote row count is not a shortlist length. |

Two of these are worth a test at the storage boundary specifically, because they are the ones a
database will happily violate: an accepted proposal with an empty reason, and a `NULL`
confidence being read back as `'moderate'`.

### Environment variables

Two separate problems here, and only the second is obvious.

**The names must match the code.** The install dialog was configured with the custom prefix
`STORAGE`, which produces `STORAGE_URL`. The helper code in the Supabase prompt reads
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Those will never match.
Either set the prefix to `NEXT_PUBLIC_SUPABASE` or change the code — but pick one, because a
silent mismatch here surfaces as an undefined URL at runtime, not as a failed install.

**`Sensitive` contradicts `NEXT_PUBLIC_`.** `NEXT_PUBLIC_*` values are inlined into the browser
bundle by design, so marking them sensitive is meaningless there and hides the value from
`vercel env pull`. Turn `Sensitive` off for the two publishable variables, and keep it firmly on
for any secret key — which must never be prefixed `NEXT_PUBLIC_`.

Under the recommended server-only shape, neither publishable variable is read at all; the app
needs the URL and the secret key. Verify whether the integration actually creates a secret key
and under what name before wiring anything up — see open questions.

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

1. **Is a secret key created by the integration, and under what name?** The recommended shape
   depends on it. Unverified.
2. **Cutover policy.** Local-first write-through, remote-first, or two-way sync? Unstated. The
   recommendation is that local stays authoritative and remote is a mirror until a separate
   entry decides otherwise, because the failure mode of getting this wrong is lost records.
3. **What happens to records already in a browser's `localStorage`** — one-time upload, or
   abandoned at cutover? Unstated.
4. **What is actually stored for attachments?** The source `url` is already recorded with a
   `linkStatus`; a bucket implies real files. Snapshots, downloads, or uploads — undecided.
5. **Multi-device.** The gate is one password, not one account. Concurrent editing from two
   browsers needs a conflict rule before it needs a schema.
6. **Does the collector move server-side?** `BRAVE_API_KEY` currently lives on the machine
   running the script.
