-- R3 D12 — the deployments row can hold what a publish actually does.
--
-- Three things were in the way of "the dashboard reflects real deployment state after each
-- attempt", and all three are here.
--
-- 1. The enum held ('pending','live','failed') while DeploymentState in the contract has
--    seven values. publish() emits 'provisioning', 'pushing', 'enabling_hosting' and
--    'verifying' as it goes; every one of those would have been rejected by the column.
--    The dashboard could therefore never show progress — only "not started" and, eventually,
--    a result.
--
-- 2. There was no updated_at, though the Deployment contract has always declared one. With
--    a single created_at, a row that changed state looked as old as the moment it began.
--
-- 3. `grant select, insert` and no update policy. A publish learns live_url, commit_sha and
--    error at the end, so an insert-only table forces either one row written after
--    everything is over — leaving the dashboard blank throughout — or a new row per state
--    change, which contradicts the "one row per publish attempt" the dashboard's own code
--    is written around.
--
-- The update policy carries the same predicate as insert: your own project, nobody else's.
-- It lets somebody rewrite the history of their own deployments, which is worth being
-- deliberate about — nothing else trusts these rows. The guarantee that a live URL responds
-- comes from publish verifying it before writing 'live' (C-05), not from the column, and the
-- existing CHECK still refuses 'live' with no URL at all.

alter type public.deployment_status add value if not exists 'provisioning';
alter type public.deployment_status add value if not exists 'pushing';
alter type public.deployment_status add value if not exists 'enabling_hosting';
alter type public.deployment_status add value if not exists 'verifying';

alter table public.deployments
  add column if not exists updated_at timestamptz not null default now();

grant update on public.deployments to authenticated;

drop policy if exists deployments_update_own on public.deployments;
create policy deployments_update_own on public.deployments
  for update to authenticated
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()))
  with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
