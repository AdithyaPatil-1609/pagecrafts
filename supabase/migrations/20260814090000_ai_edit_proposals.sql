-- Proposed AI edits. Apply is the only write to composition.json (C-03).
-- Rows are short-lived: a proposal the user never accepts is still shown (FR-066)
-- but must not live forever.

create table if not exists public.ai_edit_proposals (
  id text primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null,
  target_section_id text not null,
  patch jsonb not null,
  explanation text not null default '',
  pre_props jsonb not null default '{}'::jsonb,
  consumed boolean not null default false,
  pre_commit_sha text,
  created_at timestamptz not null default now()
);

create index if not exists ai_edit_proposals_project_idx
  on public.ai_edit_proposals (project_id, created_at desc);

alter table public.ai_edit_proposals enable row level security;

create policy ai_edit_proposals_own
  on public.ai_edit_proposals
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.ai_edit_proposals to authenticated;

comment on table public.ai_edit_proposals is
  'In-flight AI edit proposals. Apply consumes the row; propose never writes composition.json.';
