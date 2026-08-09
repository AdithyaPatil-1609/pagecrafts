-- Rollback for 20260809170000_commit_snapshot_nullable.sql
--
-- Returns the column to `not null default '{}'`. The nulls have to be filled first, which
-- reintroduces the ambiguity this migration removed — that is the point of rolling back.

update public.commits
   set snapshot = '{}'::jsonb
 where snapshot is null;

alter table public.commits alter column snapshot set default '{}'::jsonb;
alter table public.commits alter column snapshot set not null;
