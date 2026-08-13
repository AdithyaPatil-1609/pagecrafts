-- Rollback for 20260811090000_template_tier.sql
--
-- Dropping the column takes the server's only trustworthy answer to "is this design paid?"
-- with it, so the fork check falls back to treating every design as free. That is the
-- pre-D8 behaviour restored, not a new fault — but it is worth knowing before running this
-- against anything with real customers.

drop index if exists public.templates_tier_idx;

alter table public.templates
  drop column if exists tier;

drop type if exists public.template_tier;
