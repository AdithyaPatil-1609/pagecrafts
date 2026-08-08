-- Commit mirror hardening (R3 D4).
--
-- The commits table is a mirror of the Git layer, kept so history reads are a single
-- indexed query and never a live git call (E-6, V-1). The table shipped in the initial
-- schema; this migration closes the two gaps between it and the frozen contract.
--
-- 1. `author` was free text (1-120 chars) while the contract has always declared a closed
--    set — user | ai_edit | system. Three writers exist and no more: a person saving, an
--    AI edit's preceding auto-commit (V-2), and the system's own commits (fork, restore).
--    Free text lets a typo ("ai-edit") create a fourth author that nothing reads, and
--    history is append-only, so a bad row cannot be corrected later. The enum makes the
--    typo fail at write time, where it can still be fixed.
--
-- 2. Reads order by created_at within a project, and two commits can share a timestamp —
--    a fork writes its initial commit in the same instant as the row it belongs to. The
--    index gains `id` so the order is total, and a paged history cannot show the same
--    commit twice or skip one.
--
-- Append-only needs no work here: `grant select, insert` in the initial schema is the
-- whole grant, so update and delete are already impossible for a signed-in client. That is
-- the E-6 rule — restore writes a NEW commit and never rewrites what came before.

create type public.commit_author as enum ('user', 'ai_edit', 'system');

-- Fails loudly if any existing row holds something outside the set, which is the point:
-- a mirror that has drifted from the contract should stop the deploy, not be quietly
-- coerced into it.
alter table public.commits drop constraint if exists commits_author_check;

alter table public.commits
  alter column author type public.commit_author
  using author::public.commit_author;

drop index if exists commits_project_id_created_at_idx;

create index commits_project_id_created_at_idx
  on public.commits (project_id, created_at desc, id desc);
