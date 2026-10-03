-- oppie.lab — `problem_ratings`: a person's own number, stored beside the machine's.
--
-- Status: decided in DECISIONS.md #3 and designed in
-- openspec/changes/problem-analysis-rubric/design.md § 4. Additive: one new table, no column added
-- to any existing table, so dropping this table rolls the whole increment back.
--
-- How to apply: paste into the Supabase dashboard's SQL editor, as with the other three files.
-- There is no supabase CLI, psql or docker on this machine. Every statement is guarded, so running
-- it twice is harmless.
--
-- To confirm it worked after running, this should return one row for the constraint, four grants,
-- one policy, and `rowsecurity = true`:
--
--   select conname from pg_constraint where conname = 'rating_reason_required_on_divergence';
--   select grantee, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and table_name = 'problem_ratings';
--   select policyname, cmd, roles from pg_policies where schemaname = 'public'
--     and tablename = 'problem_ratings';
--   select tablename, rowsecurity from pg_tables
--     where schemaname = 'public' and tablename = 'problem_ratings';
--
-- ============================================================================
-- Two things here fail SILENTLY if they are got wrong, which is why both are CHECKs rather than
-- rules the caller is trusted to remember.
--
--   1. A rating that disagrees with the score and says nothing about why. The whole point of the
--      rating loop is the divergence log — "you said 7, the method said 3, here is why" — so a
--      divergent rating with a blank reason is worth less than no rating at all. Same shape as
--      `proposal_acceptance_carries_its_reason` in 20261001000000_init.sql, and for the same
--      reason: a violation is invisible afterwards.
--
--   2. A score stored without the count it was computed over. The score is a proportion over the
--      dimensions that were actually answered, and an unanswered dimension is never summed as a
--      zero (docs/RULES.md § 5). "4 over 5 answers" and "4 over 7 answers" are different claims
--      about the same number, so `answered_at_rating` is stored with it and the two are never
--      separated. A surface that renders `score_at_rating` without it is showing a number whose
--      inputs cannot be recovered, which is exactly what § 5 forbids.
-- ============================================================================
--
-- The number three in `rating_reason_required_on_divergence` is a copy of `DIVERGENCE_THRESHOLD` in
-- lib/analysis.ts, and SQL cannot import it. If that constant moves, this migration needs a
-- follow-up that drops and re-adds the constraint — otherwise the app and the database disagree
-- about when a reason is owed, and the database is the one that wins.

create table if not exists public.problem_ratings (
  -- Supplied by the app (`rate-<uuid>`), like every other id in the schema. Not a serial: a
  -- rating is an event and its id is quoted in logs and URLs, not an ordinal anybody counts by.
  id                  text primary key,
  problem_id          text not null references public.problems(id) on delete cascade,
  -- Which rubric produced `score_at_rating`. An old rating is a statement about a problem under an
  -- old rubric and is kept as such; nothing ever recomputes it against a newer one.
  rubric_version      integer not null check (rubric_version >= 1),
  -- Both numbers are 0-10, so "do these two disagree?" is a comparison and not a category error.
  -- `score_at_rating` is stored rather than derived: the score is recomputed on read, so after any
  -- edit to the record the divergence that prompted the reason would no longer be reproducible.
  -- The divergence is a fact about a moment.
  score_at_rating     smallint not null check (score_at_rating between 0 and 10),
  -- How many of the seven dimensions that score was computed over. NOT NULL and at least 1, which
  -- also makes "nobody has looked at this record yet" unratable in the database: with nothing
  -- answered there is no score, and a rating has nothing to agree or disagree with.
  answered_at_rating  smallint not null check (answered_at_rating between 1 and 7),
  rating              smallint not null check (rating between 0 and 10),
  -- `''` means the rating agreed with the score and no reason was asked for. That is a decided
  -- value, not a missing one: a surface must render it as "no reason needed", never as a blank, a
  -- dash or "Not added yet". Where the two diverge, the CHECK below requires real text here.
  reason              text not null default '',
  created_at          timestamptz not null default now(),
  constraint rating_reason_required_on_divergence check (
    abs(rating - score_at_rating) <= 3 or btrim(reason) <> ''
  )
);

-- Stated on its own line as well as in the guarded block at the end. The Supabase lint looks for
-- this pattern, and it cannot see inside a DO block.
alter table public.problem_ratings enable row level security;

create index if not exists problem_ratings_problem_id_idx
  on public.problem_ratings (problem_id);

-- `check` constraints cannot be added `if not exists`, so `create table if not exists` would leave
-- an existing table without it. Added here only when it is missing, so a re-run repairs that.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rating_reason_required_on_divergence') then
    alter table public.problem_ratings add constraint rating_reason_required_on_divergence check (
      abs(rating - score_at_rating) <= 3 or btrim(reason) <> ''
    );
  end if;
end $$;

-- ============================================================ access model

-- The allowlist policy, identical to the nine tables in 20261002000000_allowlist.sql, and the
-- grants that go with it. Policies decide WHICH ROWS; privileges decide WHETHER AT ALL. The init
-- migration revoked `anon` and `authenticated` on everything, and its DO block runs over the whole
-- schema — so this table is denied until the grant below is issued, and re-running the init file
-- takes the grant back. If that ever happens, re-run the allowlist file and this one.
do $$
begin
  if to_regclass('public.problem_ratings') is null then
    raise exception 'public.problem_ratings is missing — the create above did not run';
  end if;

  execute 'grant select, insert, update, delete on public.problem_ratings to authenticated';

  -- `drop` then `create` rather than `create policy if not exists`: the latter needs PostgreSQL 16
  -- and is not guaranteed on this project, and dropping first is idempotent on any version.
  execute 'drop policy if exists allow_allowlisted_users on public.problem_ratings';

  execute 'create policy allow_allowlisted_users on public.problem_ratings for all to authenticated '
       || 'using (public.is_allowed()) with check (public.is_allowed())';
end $$;

-- Not here, on purpose:
--
--   * A `unique (problem_id, rubric_version)`. A second rating under the same rubric is a real
--     thing — a person changing their mind after a source is added — and the last one is the
--     current one. Squashing them would erase a disagreement the log exists to hold.
--   * An `updated_at` or an edit path. Nothing in the app updates a rating: a new one is inserted,
--     and the old row keeps saying what was thought at the time. `update` is granted above only so
--     the policy matches the other tables and a mistyped row can be fixed by hand in the dashboard.
--   * A trigger to compute `score_at_rating` or `rubric_version`. The score is a function of the
--     record and lib/analysis.ts, computed at the moment of rating and written with the rubric
--     version that produced it. A trigger would need a second copy of the rubric in SQL — the one
--     place a scoring rule must never be duplicated — and would silently recompute history.
--   * An `owner` column. There is one allowed person and the allowlist is the gate; a per-row owner
--     would be a second, weaker copy of the same answer. Multi-user is a separate decision.
