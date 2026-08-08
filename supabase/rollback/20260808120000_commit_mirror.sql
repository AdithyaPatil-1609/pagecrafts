-- Rollback for 20260808120000_commit_mirror.sql

drop index if exists commits_project_id_created_at_idx;

alter table public.commits
  alter column author type text
  using author::text;

alter table public.commits
  add constraint commits_author_check check (char_length(author) between 1 and 120);

drop type if exists public.commit_author;

create index commits_project_id_created_at_idx
  on public.commits (project_id, created_at desc);
