drop index if exists public.generations_provider_created_at_idx;

alter table public.generations
  drop constraint if exists generations_prompt_version_check;

alter table public.generations
  drop constraint if exists generations_stage_check;

alter table public.generations
  drop constraint if exists generations_latency_ms_check;

alter table public.generations
  drop constraint if exists generations_provider_check;

alter table public.generations
  drop column if exists stage,
  drop column if exists latency_ms,
  drop column if exists prompt_version,
  drop column if exists provider;
