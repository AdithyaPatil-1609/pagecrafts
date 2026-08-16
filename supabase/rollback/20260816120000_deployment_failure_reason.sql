-- Rollback for 20260816120000_deployment_failure_reason.
--
-- Dropping the column loses why every failed publish failed. That is acceptable only
-- because `error` still carries the sentence each one was given at the time, which is what
-- the dashboard showed before this migration.

alter table public.deployments
  drop constraint if exists deployments_failure_reason_check;

alter table public.deployments
  drop column if exists failure_reason;
