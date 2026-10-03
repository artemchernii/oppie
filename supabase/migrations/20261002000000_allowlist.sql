-- oppie.lab — the allowlist: the first policy that grants anybody anything.
--
-- Status: decided in DECISIONS.md #1 and implemented here. Until this file runs, RLS has no
-- policy for `authenticated` and the init migration revoked the role outright, so the app reads
-- as empty for everyone, signed in or not. That deny is the whole reason nothing has to be
-- trusted yet; this file is what replaces it with "empty for strangers, yours when you are you".
--
-- How to apply: there is no supabase CLI, psql or docker on this machine, so paste this whole
-- file into the Supabase dashboard's SQL editor and run it. Every statement is guarded, so
-- running it twice is harmless — and re-running re-asserts the grants and policies over any
-- table listed below.
--
-- ============================================================================
-- The one thing that fails SILENTLY if it is done wrong.
--
-- A policy may NOT inline this:
--
--   exists (select 1 from public.allowed_users where user_id = auth.uid())
--
-- That subquery is itself subject to allowed_users' RLS, which has no policy and therefore
-- denies everything. Every policy then evaluates to false, the signed-in owner is denied just
-- like a stranger, and the app renders empty rather than erroring — the failure looks like lost
-- records, not like a permissions problem. The read has to go through a `security definer`
-- function, which runs as its owner and is not subject to the RLS it is checking. That is what
-- public.is_allowed() below is for, and it is the only reason it exists.
-- ============================================================================
--
-- To confirm it worked after running, all four should hold:
--
--   select user_id, note from public.allowed_users;                -- exactly one row
--   select public.is_allowed();                                    -- true, signed in as them
--   select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public';
--   select grantee, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and grantee = 'authenticated';
--
-- And to confirm the deny is still intact, the publishable key with no session must still fail
-- with `42501 permission denied` rather than return an empty list. An empty list would mean the
-- revoke was lost and RLS is doing the work alone.

-- ============================================================ the allowlist itself

-- Minimal on purpose, exactly as HANDOFF_SUPABASE.md specifies it: one column that answers the
-- question and one note saying who put it there. No role column, no expiry, no soft delete —
-- there is one user and one question, and a richer shape would be policy nobody asked for.
create table if not exists public.allowed_users (
  user_id  uuid primary key,
  note     text not null default ''
);

alter table public.allowed_users enable row level security;

-- No policy, deliberately, and revoked from both API roles. The table is readable only through
-- is_allowed() below, which is `security definer` and so is not subject to this. An API role
-- that could `select * from allowed_users` would learn who else is on the list, which is
-- nobody's business, and the revoke means it fails with 42501 rather than returning nothing.
revoke all on public.allowed_users from anon, authenticated;

-- Security definer is the whole trick; `set search_path = public` is not optional either. A
-- security definer function without a pinned search_path can be hijacked by a role that creates
-- a table shadowing `allowed_users` earlier in the path, which is the classic way this pattern
-- is turned into a privilege escalation. `stable` because it reads and does not write within a
-- statement, so the planner can call it once per query instead of once per row.
create or replace function public.is_allowed()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.allowed_users where user_id = auth.uid()
  );
$$;

comment on function public.is_allowed() is
  'True when auth.uid() is on the allowlist. SECURITY DEFINER on purpose: a policy that inlines this exists(...) is subject to allowed_users'' RLS and silently denies every row.';

-- Only `authenticated` may call it, and only `authenticated` needs to. `anon` has no identity to
-- check and the publishable key still reads nothing.
revoke all on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;

-- The one row. This id was created on 2026-10-01T23:35Z by the GitHub sign-in at /auth/callback,
-- and it is the owner's. `on conflict do nothing` keeps a re-run from resetting the note.
insert into public.allowed_users (user_id, note)
values ('f95e6591-a47f-4f2e-8f59-93b44ccebff6', 'owner')
on conflict (user_id) do nothing;

-- ============================================================ the record tables

-- The nine tables from 20261001000000_init.sql, listed rather than looped over `pg_tables`. The
-- init migration loops because "deny" is the safe default for a table nobody has thought about
-- yet; here the safe default is the opposite, so the list is explicit and a table that should
-- not be world-open cannot be swept in by a later `create table`.
--
-- allowed_users is deliberately NOT in this list. It is read through the function, never through
-- the API, and it has no policy on purpose.
do $$
declare
  t text;
  record_tables text[] := array[
    'opportunities',
    'opportunity_sources',
    'problems',
    'problem_signals',
    'companies',
    'problem_evidence',
    'problem_companies',
    'collected_sources',
    'proposals'
  ];
begin
  foreach t in array record_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise exception 'public.% is missing — apply 20261001000000_init.sql first', t;
    end if;

    -- Policies decide WHICH ROWS; privileges decide WHETHER AT ALL. They are additive, not
    -- alternatives, and the init migration revoked both API roles on every table. A policy
    -- alone would still be evaluated against a role holding no privilege, and the read would
    -- still be refused — so the grant is not optional here, it is half of the access model.
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    -- `drop` then `create` rather than `create policy if not exists`: the latter needs
    -- PostgreSQL 16 and is not guaranteed on this project, and dropping first is idempotent on
    -- any version.
    execute format('drop policy if exists allow_allowlisted_users on public.%I', t);

    -- `for all` covers select/insert/update/delete. `using` filters the rows a read, update or
    -- delete can see; `with check` is what a write is allowed to leave behind, so an update
    -- cannot move a row to a state the reader could not have created. Both call the same
    -- function, which is the point: the answer is the same for reading and for writing, so
    -- there is no chance of a table where you may read but not fix a typo.
    execute format(
      'create policy allow_allowlisted_users on public.%I for all to authenticated '
      'using (public.is_allowed()) with check (public.is_allowed())',
      t
    );
  end loop;
end $$;

-- Not here, on purpose:
--
--   * A storage policy on oppie-attachments. The bucket exists and is private, but what
--     actually goes in it is still an open question in DECISIONS.md #1, and a policy would
--     answer it by accident.
--   * A policy on allowed_users. Reading it is the function's job; opening it to the API would
--     let a signed-in person rewrite their own allowlist row.
--   * An `owner` column on the record tables. There is exactly one allowed person and the
--     allowlist is the gate, so a per-row owner would be a second, weaker copy of the same
--     answer. Multi-user is a separate decision, not a migration.
--   * Seeding anything. The six candidates in lib/data.ts stay reference data and are never
--     uploaded, so a remote row count is not a shortlist length.
