-- Discovery runs are separate from accepted Problems. A run may collect and suggest; it cannot
-- write a Problem without a human decision.

create table if not exists public.discovery_runs (
  id              text primary key,
  direction       text not null check (btrim(direction) <> ''),
  geography       text,
  role            text,
  workflow        text,
  constraint_text text,
  status          text not null default 'queued' check (status in ('queued','collecting','ready','failed')),
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.discovery_sources (
  id             text primary key,
  run_id         text not null references public.discovery_runs(id) on delete cascade,
  source_type    text not null check (source_type in ('reddit','job','freelance','vendor','trend','manual')),
  signal_type    text not null check (signal_type in ('workflow','pain','budget','price','demand','context')),
  url            text not null,
  title          text not null default '',
  publisher      text,
  observed_at    timestamptz,
  excerpt        text not null default '',
  citation       text,
  found_for      text not null default '',
  link_status    text not null default 'unverified' check (link_status in ('checked','dead','unverified')),
  triage         text not null default 'untriaged' check (triage in ('untriaged','attached','discarded')),
  created_at     timestamptz not null default now(),
  unique (run_id, url)
);

create table if not exists public.discovery_proposals (
  id               text primary key,
  run_id           text not null references public.discovery_runs(id) on delete cascade,
  title            text not null,
  workflow         text not null default '',
  actor            text,
  payer            text,
  workaround       text,
  business_pattern text,
  unknowns         jsonb not null default '[]'::jsonb,
  kill_reasons     jsonb not null default '[]'::jsonb,
  source_ids       jsonb not null default '[]'::jsonb,
  company_ids      jsonb not null default '[]'::jsonb,
  status           text not null default 'waiting' check (status in ('waiting','accepted','rejected')),
  decision_reason  text,
  decided_at       timestamptz,
  constraint discovery_acceptance_has_reason check (
    status <> 'accepted' or (btrim(coalesce(decision_reason, '')) <> '' and jsonb_array_length(source_ids) > 0)
  )
);

alter table public.discovery_runs enable row level security;
alter table public.discovery_sources enable row level security;
alter table public.discovery_proposals enable row level security;

grant select, insert, update, delete on public.discovery_runs to authenticated;
grant select, insert, update, delete on public.discovery_sources to authenticated;
grant select, insert, update, delete on public.discovery_proposals to authenticated;

create policy allow_allowlisted_users on public.discovery_runs for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());
create policy allow_allowlisted_users on public.discovery_sources for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());
create policy allow_allowlisted_users on public.discovery_proposals for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());

create index if not exists discovery_sources_run_id_idx on public.discovery_sources (run_id);
create index if not exists discovery_sources_triage_idx on public.discovery_sources (triage);
create index if not exists discovery_proposals_run_id_idx on public.discovery_proposals (run_id);
create index if not exists discovery_proposals_status_idx on public.discovery_proposals (status);
