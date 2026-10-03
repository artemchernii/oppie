# Handoff — Supabase storage

> **The storage model below is superseded.** `DECISIONS.md` #9 replaced it with one store, the
database: no browser copy, no merging, no cutover, and the seed file no longer read at runtime.
> Everything here about *merging*, *which store wins* and the *one-time push* describes how it used to
> work and is kept only because the traps at the bottom are still current. Read #9 first.

Written 2026-10-03 for the next session. Read alongside `DECISIONS.md` #1, which holds the
decision itself, and `AGENTS.md`, which holds the rules for changing anything.

## Where `master` stands

**The whole first slice is live and proven against the real database.** Four things landed:

- **#26 — the allowlist.** `supabase/migrations/20261002000000_allowlist.sql`, merged and run in
  the dashboard on 2026-10-03.
- **#27 — the first vertical slice.** `/`, `/problems/[id]` and `/inbox` render from a server-side
  read as the signed-in person, and writes go through a server action.
- **#29 — a round-trip fix** found only by verifying a real save: a `timestamptz` comes back
  `+00:00` and the app writes `Z`, so every load re-uploaded the record it had just saved.
- **#28 — the docs catch-up.** This file is its latest revision.

The app is **unlocked for the one allowlisted person, and unchanged for everyone else**. A
signed-in stranger gets an empty list rather than an error, which is what RLS is for; the only way
to tell the two apart is to be the owner or to run the check in step 2.

## Next, in order

### 1. The allowlist is applied — this is the record of how

`supabase/migrations/20261002000000_allowlist.sql` was pasted into the Supabase dashboard's SQL
editor and run on 2026-10-03. There is no `psql`, `supabase` CLI or docker on this machine, so the
dashboard is the only route, and every statement is guarded so re-running is harmless.

It adds `allowed_users`, the `security definer` function `public.is_allowed()`, grants and
policies on the nine record tables, and the one row for
`f95e6591-a47f-4f2e-8f59-93b44ccebff6`.

**The part that fails silently if it is got wrong.** A policy may not inline

```sql
exists (select 1 from public.allowed_users where user_id = auth.uid())
```

That subquery is itself subject to `allowed_users`' RLS, which has no policy and denies
everything. Every policy then evaluates to false, the owner is denied exactly like a stranger, and
the app renders empty rather than erroring — it looks like lost records, not like a permissions
problem. The read goes through `public.is_allowed()`, which is `security definer` and therefore
not subject to the policy it is checking.

### 2. Re-run these after any change to the access model

A permissions mistake here looks like missing records rather than an error, so these are worth
repeating whenever the policies, the grants or the function change. The first four are dashboard
SQL; the last is the app.

```sql
select user_id, note from public.allowed_users;                        -- exactly one row
select public.is_allowed();                                            -- true, signed in as them
select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public';
select grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated';
```

Then, in the app: edit a field, reload, and confirm it came back from the database rather than
from `localStorage`. The footer reads "Stored in the database" when the read succeeded, and
"Database unreachable" when it did not — that line is the fastest way to tell which store you are
looking at.

**The publishable key with no session must still fail with `42501`, not return an empty list.**
The revoke from `anon` in the init migration is what makes the difference, and an empty list means
that revoke was lost.

### 3. The remaining screens, then attachments

`companies`, then `opportunities`, then the inbox's own records (`collected_sources`,
`proposals` — still on `localStorage`; `/inbox` only borrows the problem list). Follow the shape
the problems slice established rather than inventing a second one:

| Piece | What it does |
|---|---|
| `lib/<type>Remote.ts` | Server-only. Reads and writes as the signed-in person via `lib/supabase/server.ts`. Never the secret key. |
| `lib/<type>Sync.ts` | React-free. Row ↔ record mapping, the first-load merge, and what may be uploaded. This is the file `pnpm test` covers. |
| `lib/<type>Actions.ts` | `"use server"`. The write boundary, plus `revalidatePath`. |
| `lib/<type>Store.ts` | The hook. Takes the server's read as a prop, gates every write on `hydrated`. |
| `app/<route>/page.tsx` | `force-dynamic`. Reads and passes the prop down. |

The bucket `oppie-attachments` exists and is private. **What actually goes in it is still
undecided** — see the open questions in `DECISIONS.md` #1. No storage policy was added on purpose,
so a policy would be the answer to that question and not the preamble to it.

## What is verified, not assumed

- **The 9 tables exist** and match `lib/data.ts`, `lib/problems.ts` and `lib/research.ts`:
  `opportunities`, `opportunity_sources`, `problems`, `problem_signals`, `companies`,
  `problem_evidence`, `problem_companies`, `collected_sources`, `proposals`.
- **The secret key reads all of them**; the bucket `oppie-attachments` exists and is private.
- **The publishable key is denied on every table** with `42501 permission denied` — a hard error,
  not an empty list, because the migration revokes `anon` explicitly. That stays true after the
  allowlist lands: `anon` has no identity to check.
- **The gate works live**: `/` and `/inbox` redirect to `/login`; `/login` renders the GitHub link
  with no nav; `/auth/signin` redirects to Supabase's authorize endpoint with a PKCE cookie set.
- **One user is registered**: `f95e6591-a47f-4f2e-8f59-93b44ccebff6`, created 2026-10-01T23:35Z.
- **81 assertions across 4 suites, 0 failed**, and `pnpm build` is clean with every problem route
  dynamic. CI green on both PRs.
- **The policy actually grants the owner.** Verified live on 2026-10-03, first by the app (the
  footer reads "Stored in the database", which only happens when the read returned `[]` rather
  than failing), then by the field-by-field save below.
- **A saved record round-trips losslessly.** A field-by-field diff of the first real save against
  its seed came back with only the intended `title`, one trailing space in `competition` (which
  correctly makes the record the user's rather than a seed), and the timestamp format below. All
  five signals kept `null` as `null`, and the evidence row kept its `type` and `link_status`.
- **No pristine seed has ever reached the database.** Checked directly against the live rows with
  the same `isPristineSeed` the app uses.

## The hydration contract, and why it is shaped this way

`lib/problemStore.ts` used to read `localStorage` synchronously in an effect: "after mount" and
"after the data arrived" were the same instant, so nothing could render in between. A remote read
is not instant, and that gap is the exact shape of bug that eats records — a pre-load render
persisting the seed over the user's work.

The slice removes the gap rather than guarding it:

1. The server reads as the signed-in person and passes the list in, so the **first client render
   already has the records** and matches the server render byte for byte.
2. `hydrated` is set in the **same effect** that sets the merged records — one commit, so the first
   render allowed to write is already the reconciled list.
3. Every write stays gated on `hydrated` anyway, so the contract holds even if a render sneaks in.

Three rules live in `lib/problemSync.ts`, React-free so they can be tested without a browser:

- **A failed read is not an empty table.** `null` means "the remote state is unknown": the
  browser's records are shown, nothing is uploaded. `[]` means the table is genuinely empty, and
  only then is local work pushed up. Uploading into a table that could not be read is how a stale
  copy overwrites a newer one.
- **The seeds are never uploaded.** `isPristineSeed` compares a record against the seed it came
  from, so reference data stays in the browser and a seed becomes a user record the moment any
  field is edited.
- **`problem_companies` is read but not written, and the gap is measured.** Its foreign key points
  at `companies`, which is still seed-only data; a link row would need the reference companies
  uploaded, which `DECISIONS.md` #1 forbids. Company attribution is read-only in the UI. The
  measured consequence: an edited problem whose seed carried company ids **loses them on a browser
  that has no local copy** — P-002's seed list was empty so this was not exercised, but P-001
  carries seven. It moves with the companies screen.

## What already happened to `localStorage`

Answered, and worth not re-litigating: **the browser's records are pushed up once, then the
database is authoritative.** The push happens on the first successful load, only for records the
database does not already have, and only for records that are not pristine seeds. A failed push is
recomputed on the next load, so nothing is stranded. `localStorage` stays as an offline cache and
is written on every change, but it is never read as the source of truth again.

**Measured on the first live load: it pushed nothing.** The database was empty and the browser
held only the pristine seed list, so there was nothing uploadable — which is the "seeds are never
uploaded" rule doing its job rather than a failure. The problems screen has always rendered
`lib/problems.ts` reference data; nobody had ever typed a record into it, so the first user record
in the database is the P-002 edit made to test the write path.

`resetToSeed` is now **local-only**: it puts the seed back on screen for this browser and writes
nothing. It is not a delete, and the recorded problems are the user's.

## Facts worth not rediscovering

| | |
|---|---|
| Supabase project | `yinzapldlqsyciekfqfd` (`https://yinzapldlqsyciekfqfd.supabase.co`) |
| Env vars the app reads | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (both already in Vercel and `.env.local`) |
| Env vars for admin only | `SUPABASE_SECRET_KEY` |
| Not needed | `SUPABASE_JWT_SECRET`, `SUPABASE_JWKS_URL`, the `POSTGRES_*` set, the three `NEXT_PUBLIC_POSTGRES_DBSUPABASE_*` duplicates |
| Node | 22+ required — `engines.node` says so because `@supabase/supabase-js` needs a global `WebSocket` |
| Package manager | `pnpm` only |
| SQL | pasted into the Supabase dashboard's SQL editor |
| Test command | `pnpm test` — 83 assertions, no framework. Add to `scripts/problems.test.js` for anything in `lib/problemSync.ts`, and add the file to the `tsc` list in `package.json` if it is new |

**No `NEXT_PUBLIC_` variable is needed, and that is deliberate.** Sign-in, the code exchange,
sign-out, reads and writes are all server-side, so no Supabase key is ever inlined into a browser
bundle. If you find yourself adding a `NEXT_PUBLIC_SUPABASE_*` variable, something has drifted
from that design.

## Traps that have already cost time

- **A `timestamptz` and `toISOString()` are the same instant and different strings.** Postgres
  returns `2026-10-03T09:28:10.122+00:00`; the app writes `...122Z`. The re-upload comparison is
  structural, so before #29 a record never matched the row it had just become and *every page load
  wrote it again* — idempotent, so nothing was corrupted, and invisible to every test because the
  tests had never seen data that came back from Postgres. The read path canonicalises now. If you
  add another date-shaped column, put it through `timestamp()` in `lib/problemSync.ts`.
- **`.next` is shared between `pnpm build` and `pnpm dev`.** Whichever writes last breaks the
  other. The second time it bit, production artefacts were sitting in `.next` while a dev server
  served from it: the stylesheet 404'd with an HTML body and every page rendered as unstyled HTML,
  with nothing pointing at the cause. Fix is always: stop dev, `rm -rf .next`, start again.
- **Catching an error from `cookies()` un-prerenders a page silently.** Next signals "this route
  cannot be static" by *throwing* from `cookies()`, and a `try/catch` that returns a fallback
  swallows it — the route is then generated once at build time and that snapshot is served to
  everybody. `lib/problemRemote.ts` rethrows anything with a `DYNAMIC_SERVER_USAGE`/`NEXT_` digest,
  and the three problem routes are `force-dynamic` so the question does not arise.
- **There is no `@/` path alias.** `tsconfig.json` has no `baseUrl` and no `paths`. Use relative
  imports — the Supabase onboarding prompt assumes the alias exists.
- **No `psql`, no `supabase` CLI, no `docker`** on this machine. DDL cannot be applied from here.
- **Do not run `vercel env pull`.** It overwrites `.env.local`, which holds `BRAVE_API_KEY`, a
  variable Vercel knows nothing about. It also cannot retrieve the hidden values anyway.
- **Deleting a file can leave stale types** in `.next/types`, which fails `tsc --noEmit` until that
  directory is cleared.
- **`git stash push -- <path>` did not behave as a pathspec-only stash here**, and later conflicted
  against a rename. Prefer committing on a branch over stashing.
- **`pnpm test` compiles an explicit file list**, not the whole project. A new file that nothing on
  that list imports is silently untested.

## Accepted, do not "fix"

**Email signup is enabled in Supabase** alongside GitHub. That is deliberate — the owner chose to
leave it. It grants nothing: RLS denies `authenticated` unless the id is on the allowlist.

## Still open

What attachments are; multi-device conflicts; whether the research collector moves server-side;
whether the legacy opportunity board is migrated into problem records or retired; whether
`companies` is ever writable rather than seed-only. All listed at the end of `DECISIONS.md` #1.
None of them block the next screen.

`STATUS.md` lags the auth and Supabase work — it still describes `lib/auth.ts`, deleted in #22.
This file is the accurate one, and the one to update first.
