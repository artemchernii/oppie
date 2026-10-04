-- oppie.lab — the owner's decisions on the Ideas board (Pursue, Park, Drop).
--
-- The idea records themselves live in lib/ideas.ts and change by PR. Only the owner's decision is
-- stored here. Rows are appended, never edited: the newest row per idea is its current status, so
-- the history of a change of mind is kept. See DECISIONS.md #10.
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent.

create table if not exists public.idea_decisions (
  id          bigint generated always as identity primary key,
  idea_id     text not null check (btrim(idea_id) <> ''),
  status      text not null check (status in ('pursue','park','drop')),
  reason      text not null check (btrim(reason) <> ''),
  decided_at  timestamptz not null default now()
);

create index if not exists idea_decisions_idea_id_idx on public.idea_decisions (idea_id, decided_at desc);

alter table public.idea_decisions enable row level security;
revoke all on public.idea_decisions from anon;
grant select, insert on public.idea_decisions to authenticated;

drop policy if exists allow_allowlisted_users on public.idea_decisions;
create policy allow_allowlisted_users on public.idea_decisions for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());

-- The owner parked NIS2 in chat on 2026-10-04 (STATUS.md, "NIS2 supplier-side paid-today test").
-- Recorded here so the board shows it; running this file is the owner's act of recording it.
insert into public.idea_decisions (idea_id, status, reason, decided_at)
select 'nis2-supplier-evidence', 'park',
       'Free and near-free fixes exist and no small supplier was found paying.',
       '2026-10-04T15:00:00Z'
where not exists (select 1 from public.idea_decisions where idea_id = 'nis2-supplier-evidence');
