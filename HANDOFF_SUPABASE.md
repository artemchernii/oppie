# Handoff — Supabase storage

Written 2026-10-02 for the next session. Read alongside `DECISIONS.md` #1, which holds the
decision itself, and `AGENTS.md`, which holds the rules for changing anything.

## Where `master` stands

Auth and the database are wired, and the app is **locked, deliberately**. Sign-in works end to end
but nothing can read a record yet, because no policy grants the signed-in person anything.

Shipped so far, in order: the decision record (`DECISIONS.md` #1), the schema and a server-only
client, the env-var documentation, the GitHub sign-in that replaced a hand-rolled password gate,
and the `.next` gotcha that was hit twice.

## What is verified, not assumed

- **The 9 tables exist** and match `lib/data.ts`, `lib/problems.ts` and `lib/research.ts`:
  `opportunities`, `opportunity_sources`, `problems`, `problem_signals`, `companies`,
  `problem_evidence`, `problem_companies`, `collected_sources`, `proposals`.
- **The secret key reads all of them**; the bucket `oppie-attachments` exists and is private.
- **The publishable key is denied on every table** with `42501 permission denied` — a hard error,
  not an empty list, because the migration revokes `anon` explicitly.
- **The gate works live**: `/` and `/inbox` redirect to `/login`; `/login` renders the GitHub link
  with no nav; `/auth/signin` redirects to Supabase's authorize endpoint with a PKCE cookie set.
- **One user is registered**: `f95e6591-a47f-4f2e-8f59-93b44ccebff6`, created 2026-10-01T23:35Z.
- 64 assertions across 4 suites, 0 failed. CI green.

## Next, in order

### 1. The allowlist — this is the thing that unlocks everything

GitHub answers *who you are*. Nothing yet answers *whether you are allowed*. Today that is covered
by accident: RLS has no policy for `authenticated` and `authenticated` is revoked, so even a
signed-in stranger reads nothing. Opening the records means adding the allowlist at the same time.

What it needs, as a new migration in `supabase/migrations/`:

- `allowed_users (user_id uuid primary key, note text not null default '')`, RLS on, no policy —
  it is read only through the function below, never through the API.
- `public.is_allowed()` as a `security definer` function with `set search_path = public`. **This
  is not optional and is the easiest thing to get wrong:** a policy that writes
  `exists (select 1 from allowed_users where user_id = auth.uid())` inline is itself subject to
  `allowed_users`'s RLS, which denies everything, so every policy silently evaluates to false and
  the app looks empty rather than broken.
- One row for the user id above, then policies on the record tables for `authenticated` using
  `public.is_allowed()`, with a matching `with check` on writes.

Apply it by pasting into the Supabase dashboard's SQL editor — see Traps.

### 2. One screen, end to end

The vertical slice that proves the hydration contract before five screens depend on it. `problems`
is the biggest record type and the right first one.

`lib/problemStore.ts` loads stored data in an effect *after* mount and gates writes on `hydrated`,
specifically so a pre-load render cannot overwrite what you had. A remote store makes that read
async, which is the exact shape of bug that silently eats records — and `AGENTS.md` § 4 says
storage is the one thing that must have coverage. Add assertions with the change.

Read through `lib/supabase/server.ts`, which acts as the signed-in person and is subject to RLS.
`lib/supabase/service.ts` bypasses RLS entirely and is for admin work only.

### 3. The remaining screens, then attachments

`inbox`, `companies`, `opportunities`. The bucket exists and is private; **what actually goes in it
is still undecided** — see the open questions in `DECISIONS.md` #1.

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

**No `NEXT_PUBLIC_` variable is needed, and that is deliberate.** Sign-in, the code exchange and
sign-out are all route handlers, so no Supabase key is ever inlined into a browser bundle. If you
find yourself adding a `NEXT_PUBLIC_SUPABASE_*` variable, something has drifted from that design.

## Traps that have already cost time

- **`.next` is shared between `pnpm build` and `pnpm dev`.** Whichever writes last breaks the
  other. The second time it bit, production artefacts were sitting in `.next` while a dev server
  served from it: the stylesheet 404'd with an HTML body and every page rendered as unstyled HTML,
  with nothing pointing at the cause. Fix is always: stop dev, `rm -rf .next`, start again.
- **There is no `@/` path alias.** `tsconfig.json` has no `baseUrl` and no `paths`. Use relative
  imports — the Supabase onboarding prompt assumes the alias exists.
- **No `psql`, no `supabase` CLI, no `docker`** on this machine. DDL cannot be applied from here.
- **Do not run `vercel env pull`.** It overwrites `.env.local`, which holds `BRAVE_API_KEY`, a
  variable Vercel knows nothing about. It also cannot retrieve the hidden values anyway.
- **Deleting a file can leave stale types** in `.next/types`, which fails `tsc --noEmit` until that
  directory is cleared.
- **`git stash push -- <path>` did not behave as a pathspec-only stash here**, and later conflicted
  against a rename. Prefer committing on a branch over stashing.

## Accepted, do not "fix"

**Email signup is enabled in Supabase** alongside GitHub. That is deliberate — the owner chose to
leave it. It grants nothing, since RLS denies `authenticated` until the allowlist lands.

## Still open

Cutover direction (local-first or remote-first), what happens to records already in a browser's
`localStorage`, what attachments are, multi-device conflicts, and whether the research collector
moves server-side. All listed at the end of `DECISIONS.md` #1. None of them block step 1.
