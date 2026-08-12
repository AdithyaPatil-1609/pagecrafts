-- Rollback for 20260811150000_deployment_progress.sql
--
-- The enum values are NOT removed. Postgres has no `alter type ... drop value`, and the
-- only way to take one out is to rebuild the type and rewrite every column using it — which
-- would fail anyway for any row already sitting in an intermediate state. Leaving them is
-- harmless: an unused enum value costs nothing, and nothing reads them once the code that
-- writes them is gone.

drop policy if exists deployments_update_own on public.deployments;

revoke update on public.deployments from authenticated;

alter table public.deployments
  drop column if exists updated_at;
