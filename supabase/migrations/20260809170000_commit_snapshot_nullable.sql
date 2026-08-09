-- R3 D6 follow-up · commits.snapshot must be able to say "no tree here".
--
-- 20260808160000 added the column as `not null default '{}'`, which handed every commit
-- written before that migration an empty file map. An empty map is indistinguishable from
-- a real site with no files, so restore would happily write it over the user's working
-- tree and blank their pages while reporting success.
--
-- null is the honest value for a commit that pre-dates snapshots. getCommitSnapshot()
-- refuses null and empty alike, so the restore path can say why instead of destroying
-- something.
--
-- Fixed forward rather than by editing 20260808160000 in place: that migration is merged
-- and may already be applied, and rewriting an applied migration forks the history between
-- whoever has run it and whoever has not.

alter table public.commits alter column snapshot drop default;
alter table public.commits alter column snapshot drop not null;

-- The rows the previous default reached. Only ever '{}' — no commit written since then can
-- hold an empty tree, because putProjectFiles rejects a file map with no files.
update public.commits
   set snapshot = null
 where snapshot = '{}'::jsonb;

comment on column public.commits.snapshot is
  'FileMap (path -> text) as it stood at this commit; null for commits written before D6. '
  'Bounded by the 50 file / 2 MB project ceiling.';
