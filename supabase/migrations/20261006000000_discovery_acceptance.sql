-- Human acceptance links a proposal and its cited sources to the Problem that the person chose.
-- This migration is separate because the discovery tables may already be applied.

alter table public.discovery_proposals
  add column if not exists problem_id text references public.problems(id) on delete set null;

alter table public.discovery_sources
  add column if not exists problem_id text references public.problems(id) on delete set null;

create index if not exists discovery_proposals_problem_id_idx on public.discovery_proposals (problem_id);
create index if not exists discovery_sources_problem_id_idx on public.discovery_sources (problem_id);
