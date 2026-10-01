-- oppie.lab — the remote schema, as decided in DECISIONS.md #1.
--
-- Status: decided, NOT implemented. Nothing in the app reads these tables yet and
-- localStorage is still the only store. Applying this file changes no behaviour until a
-- later PR reads it.
--
-- How to apply: there is no supabase CLI, psql or docker on this machine, so paste this
-- whole file into the Supabase dashboard's SQL editor and run it. Every statement is
-- guarded, so running it twice is harmless — and re-running re-asserts the access model
-- over any table added since.
--
-- Two rules govern everything below.
--
-- 1. The tables mirror lib/data.ts, lib/problems.ts and lib/research.ts exactly, because
--    a schema that drifts from the types is a second source of truth. Where the
--    TypeScript field is optional (`confidence?`), the column is NULLABLE with a CHECK and
--    NO default — a default there would fabricate a rating nobody gave. Where the field is
--    a required string, it is NOT NULL DEFAULT '', because "" is what the app already
--    writes for an empty field. Defaults appear only where the app's own empty record has
--    that value.
--
--    One deliberate deviation: `Company.where` is named `location`, because `where` is a
--    reserved word and every query would need quoting.
--
-- 2. Every table denies everyone. RLS is on and there is not one policy, so the
--    publishable key reads nothing even though it ships to browsers by design. The server
--    reaches the data with the secret key, which bypasses RLS. That is the entire access
--    model — there is no signed-in user to scope a policy to. Adopting Supabase Auth would
--    mean adding an owner column and real policies, which is a separate decision.

-- =========================================================== opportunities (lib/data.ts)

create table if not exists public.opportunities (
  id                  text primary key,
  title               text not null default '',
  category            text not null default '',
  thesis              text not null default '',
  stage               text not null default 'discovery'
                        check (stage in ('discovery','investigate','validate','build','pause','kill')),
  evidence_status     text not null default 'early'
                        check (evidence_status in ('early','mixed','crowded')),
  status_note         text not null default '',
  evidence_summary    text not null default '',
  unknowns            text not null default '',
  build_estimate      text not null default '',
  pricing_hypothesis  text not null default '',
  kill_reason         text not null default '',
  next_test           text not null default '',
  tags                text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.opportunity_sources (
  id              text primary key,
  opportunity_id  text not null references public.opportunities(id) on delete cascade,
  type            text not null default 'Other'
                    check (type in ('YC','Reddit','Company','Pricing','Review','Job',
                                    'Regulation','Acquisition','Other')),
  label           text not null default '',
  url             text not null default '',
  note            text not null default '',
  -- Optional on purpose, exactly as in lib/data.ts. NULL is "unrated" and renders
  -- "Not rated yet". A default of 'moderate' would invent a confidence nobody entered.
  confidence      text check (confidence in ('strong','moderate','weak')),
  -- sources[] is an ordered array in the model, so the order has to survive the round trip.
  position        integer not null default 0
);

create index if not exists opportunity_sources_opportunity_id_idx
  on public.opportunity_sources (opportunity_id);

-- ============================================================== problems (lib/problems.ts)

create table if not exists public.problems (
  id             text primary key,
  title          text not null default '',
  gate           text not null default 'G1-signal'
                   check (gate in ('G1-signal','G2-paid','G3-repeated','G4-buyer','G5-tested')),
  action         text not null default 'idle'
                   check (action in ('idle','researching','interviewing','hand-running','building')),
  verdict        text not null default 'open'
                   check (verdict in ('open','parked','killed')),
  domain         text not null default '',
  market         text not null default '',
  what           text not null default '',
  affected_role  text not null default '',
  buyer          text not null default '',
  workaround     text not null default '',
  frequency      text not null default '',
  consequence    text not null default '',
  why_they_pay   text not null default '',
  paid_today     text not null default '',
  competition    text not null default '',
  path           text not null default 'undecided'
                   check (path in ('service','product','undecided')),
  next_question  text not null default '',
  unknowns       text not null default '',
  kill_reason    text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- The five readiness questions, at equal weight. There is deliberately no total column:
-- readiness() in lib/problems.ts computes it, blanks are counted rather than treated as
-- zero, and PAIN_FUNNEL.md labels the result a judgement rather than a measurement. A
-- stored total would be an invented index the moment a blank was summed as 0.
create table if not exists public.problem_signals (
  problem_id  text not null references public.problems(id) on delete cascade,
  key         text not null check (key in ('pain','pay','moat','speed','cost')),
  -- Denormalised from signalDefs in lib/problems.ts, which stays canonical. Stored
  -- because Signal carries it per instance, and a join to a constant is worse than a copy.
  question    text not null default '',
  -- `Score = 0 | 1 | 2 | 3 | null`. NULL is "not rated" and is a different reading from
  -- 0, which is a real answer. No default, and NOT NULL would be a lie.
  value       smallint check (value between 0 and 3),
  -- Not enforced here: the model treats a score without a note as a guess the UI flags,
  -- not as a rejection. The hard rule about carrying a reason belongs to accepted
  -- proposals, and that one is enforced below.
  note        text not null default '',
  primary key (problem_id, key)
);

-- Confidence here is `direct | reported | inferred`, which is a DIFFERENT union from the
-- `strong | moderate | weak` used by opportunity sources. Same word, two scales.
create table if not exists public.companies (
  id            text primary key,
  name          text not null default '',
  kind          text not null default 'vendor' check (kind in ('employer','vendor','bespoke')),
  location      text not null default '',
  role          text not null default '',
  -- The money, verbatim, as text on purpose: it renders "Not added yet" when empty, and a
  -- numeric column would turn an unentered figure into a 0.
  number        text not null default '',
  number_label  text not null default '',
  url           text not null default '',
  -- Required in the model, so there is no default here either.
  confidence    text not null check (confidence in ('direct','reported','inferred')),
  link_status   text not null check (link_status in ('checked','dead','unverified')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.problem_evidence (
  id          text primary key,
  problem_id  text not null references public.problems(id) on delete cascade,
  type        text not null
                check (type in ('job','price','procurement','community','report','personal')),
  observation text not null default '',
  url         text not null default '',
  -- Text, not `date`: this is a field a person types, and "2024-Q1" or "last spring" is a
  -- real answer that a date column would reject.
  date        text not null default '',
  confidence  text not null check (confidence in ('direct','reported','inferred')),
  -- Optional in the model, and the read path already applies `?? "unverified"` so an
  -- untriaged row never claims to have been opened. NULL keeps the database from claiming
  -- either.
  link_status text check (link_status in ('checked','dead','unverified')),
  position    integer not null default 0
);

create index if not exists problem_evidence_problem_id_idx
  on public.problem_evidence (problem_id);

create table if not exists public.problem_companies (
  problem_id  text not null references public.problems(id) on delete cascade,
  company_id  text not null references public.companies(id) on delete cascade,
  position    integer not null default 0,
  primary key (problem_id, company_id)
);

create index if not exists problem_companies_company_id_idx
  on public.problem_companies (company_id);

-- ============================================================== research (lib/research.ts)

-- The inbox. Untriaged means status 'new', and the model is explicit that untriaged
-- sources count in no total — nothing here aggregates them.
create table if not exists public.collected_sources (
  id             text primary key,
  url            text not null default '',
  title          text not null default '',
  finding        text not null default '',
  found_for      text not null default '',
  suggests       text,
  collected_at   timestamptz not null default now(),
  status         text not null default 'new' check (status in ('new','kept','spent')),
  attach_to      text references public.problems(id) on delete set null,
  evidence_type  text check (evidence_type in ('job','price','procurement','community',
                                               'report','personal')),
  confidence     text check (confidence in ('direct','reported','inferred')),
  link_status    text check (link_status in ('checked','dead','unverified'))
);

create index if not exists collected_sources_status_idx on public.collected_sources (status);
create index if not exists collected_sources_attach_to_idx on public.collected_sources (attach_to);

-- A suggestion, never a conclusion. The pipeline may insert rows here freely; nothing may
-- reach the problem record until a person accepts it, and acceptance has to carry its
-- reason and its source. That is the one rule worth holding in the database rather than
-- trusting the caller, because a violation is silent and permanent.
create table if not exists public.proposals (
  id          text primary key,
  problem_id  text not null references public.problems(id) on delete cascade,
  signal_key  text not null check (signal_key in ('pain','pay','moat','speed','cost')),
  -- NOT NULL, unlike problem_signals.value: a proposal always proposes a value. It is the
  -- hand-entered signal that can be blank.
  value       smallint not null check (value between 0 and 3),
  reason      text not null default '',
  source_url  text not null default '',
  status      text not null default 'proposed'
                check (status in ('proposed','accepted','rejected')),
  created_at  timestamptz not null default now(),
  constraint proposal_acceptance_carries_its_reason check (
    status <> 'accepted' or (btrim(reason) <> '' and btrim(source_url) <> '')
  )
);

create index if not exists proposals_problem_id_idx on public.proposals (problem_id);
create index if not exists proposals_status_idx on public.proposals (status);

-- ================================================================ access model

-- Run last, and over every table in the schema rather than a list, so a table added later
-- is denied by default instead of by remembering. RLS with no policy already denies; the
-- revoke makes it explicit and survives a `grant all` added out of habit.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;

-- Attachments. Private, with no storage policy, so a publishable key cannot read or write
-- a single object and the server hands out signed URLs. What actually goes in the bucket
-- is still an open question in DECISIONS.md #1 — the container is here so the answer has
-- somewhere to go.
insert into storage.buckets (id, name, public, file_size_limit)
values ('oppie-attachments', 'oppie-attachments', false, 26214400)
on conflict (id) do nothing;

-- Not here, on purpose:
--
--   * The six seeded candidates in lib/data.ts. They are reference data for the method,
--     not a shortlist, and uploading them would make a remote row count read like one.
--   * Any total, index or composite score. Aggregates are computed at read time only.
--   * An owner column. There is one user and no Supabase identity, which is why access is
--     server-only. Adding accounts is a separate decision, not a migration.
--   * An updated_at trigger. The app sets both timestamps itself, and a trigger would
--     silently overwrite what it wrote.
