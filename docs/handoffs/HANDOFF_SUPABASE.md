# Handoff — Supabase storage

Written 2026-10-03 for the next session. Read alongside `DECISIONS.md` #1, which holds the
decision itself, and `AGENTS.md`, which holds the rules for changing anything.

## Where `master` stands

Auth and the schema are wired, and **the problems screen now reads and writes through Supabase**.
Two things landed since the last handoff:

- **#26 — the allowlist.** `supabase/migrations/20261002000000_allowlist.sql` exists and is
  merged. **It has not been run.** Until it is, `authenticated` still holds nothing and every
  read is denied.
- **#27 — the first vertical slice.** `/`, `/problems/[id]` and `/inbox` render from a
  server-side read as the signed-in person, and writes go through a server action.

The app is **not locked any more, but also not yet open**: with the allowlist unapplied the read
fails, the screen falls back to the seed plus whatever this browser holds, and the footer says
"Database unreachable". Nothing is lost in that state and nothing is written.

## Next, in order

### 1. Run the allowlist migration — this is the only thing blocking everything

Paste `supabase/migrations/20261002000000_allowlist.sql` into the Supabase dashboard's SQL editor
and run it. There is no `psql`, `supabase` CLI or docker on this machine, so the dashboard is the
only route. Every statement is guarded; running it twice is harmless.

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

### 2. Prove it, rather than assuming it

Four checks, all in the dashboard's SQL editor or against the running app:

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
- **Not verified: the policy itself.** `is_allowed()` has never been evaluated as the owner, so the
  first live read after step 1 is the real test.

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
- **`problem_companies` is read but not written.** Its foreign key points at `companies`, which is
  still seed-only data; a link row would need the reference companies uploaded, which
  `DECISIONS.md` #1 forbids. Company attribution is read-only in the UI, so nothing reachable was
  lost. It moves with the companies screen.

## What already happened to `localStorage`

Answered, and worth not re-litigating: **the browser's records are pushed up once, then the
database is authoritative.** The push happens on the first successful load, only for records the
database does not already have, and only for records that are not pristine seeds. A failed push is
recomputed on the next load, so nothing is stranded. `localStorage` stays as an offline cache and
is written on every change, but it is never read as the source of truth again.

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
| Test command | `pnpm test` — 81 assertions, no framework. Add to `scripts/problems.test.js` for anything in `lib/problemSync.ts`, and add the file to the `tsc` list in `package.json` if it is new |

**No `NEXT_PUBLIC_` variable is needed, and that is deliberate.** Sign-in, the code exchange,
sign-out, reads and writes are all server-side, so no Supabase key is ever inlined into a browser
bundle. If you find yourself adding a `NEXT_PUBLIC_SUPABASE_*` variable, something has drifted
from that design.

## Traps that have already cost time

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
None of them block step 1.

`STATUS.md` is behind on the auth and Supabase work — it still describes `lib/auth.ts`, which was
deleted in #22. This file is the accurate one.
