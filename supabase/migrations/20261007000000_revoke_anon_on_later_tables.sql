-- oppie.lab — take `anon` back off the tables created after the init migration.
--
-- Why: the init migration's revoke loop ran over the tables that existed then. Tables created
-- later (problem_ratings, discovery_runs, discovery_sources, discovery_proposals) kept Supabase's
-- default grants, so `anon` can still SELECT them. RLS has no `anon` policy, so no row leaks —
-- but a request without a session gets an EMPTY LIST instead of `42501 permission denied`.
-- That is the silent failure 20261002000000_allowlist.sql warns about: a lost session looks like
-- missing records rather than a refusal.
--
-- Found 2026-10-04: the isolated Playwright server (no session) read /inbox as "0 sources,
-- 0 proposals" while the same request for `problems` failed with 42501.
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent; revoking a privilege that
-- is not held is a no-op. `authenticated` keeps its grants — the allowlist policy decides rows.
--
-- To confirm, all should return no rows:
--   select table_name, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and grantee = 'anon';

do $$
declare
  t text;
begin
  foreach t in array array['problem_ratings', 'discovery_runs', 'discovery_sources', 'discovery_proposals'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on public.%I from anon', t);
    end if;
  end loop;
end $$;
