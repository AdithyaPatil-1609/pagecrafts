-- Rollback for 20260808120000_commit_snapshots.sql

drop function if exists public.replace_project_files(uuid, jsonb);

alter table public.project_files
  drop constraint if exists project_files_path_shape;

alter table public.commits
  drop column if exists snapshot;
