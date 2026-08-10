-- The cost ledger (src/lib/ai/cost/ledger.ts) produces four fields that
-- public.generations has no home for, so no row can be stored. This adds them.
--
-- Every column is nullable or defaulted, because the table already holds rows
-- from before the ledger existed and a NOT NULL without a default would fail on
-- them.

alter table public.generations
  add column if not exists provider text,
  add column if not exists prompt_version text,
  add column if not exists latency_ms integer not null default 0,
  add column if not exists stage text;

-- provider is text with a check rather than an enum. The set of providers moves
-- with the fallback chain — gemini, groq and cerebras today — and widening a
-- check is a plain DDL statement, where ALTER TYPE ADD VALUE cannot run inside a
-- transaction alongside other statements. 'unknown' is included because the
-- ledger emits it when a call fails before a provider is chosen.
alter table public.generations
  add constraint generations_provider_check
  check (provider is null or provider in ('gemini', 'groq', 'cerebras', 'unknown'));

alter table public.generations
  add constraint generations_latency_ms_check
  check (latency_ms >= 0);

alter table public.generations
  add constraint generations_stage_check
  check (stage is null or char_length(stage) between 1 and 40);

alter table public.generations
  add constraint generations_prompt_version_check
  check (prompt_version is null or char_length(prompt_version) between 1 and 40);

-- D17 builds a cost dashboard and NFR-142 requires reconciling spend against the
-- provider invoice. Both group by provider over a date range, and the existing
-- indexes are keyed on user_id and created_at only.
create index if not exists generations_provider_created_at_idx
  on public.generations (provider, created_at desc);

comment on column public.generations.provider is
  'Which provider served this call. Null for rows written before the fallback chain existed.';
comment on column public.generations.prompt_version is
  'Prompt template version, so a quality change can be traced to a prompt change.';
comment on column public.generations.latency_ms is
  'Wall-clock time for the provider call.';
comment on column public.generations.stage is
  'Pipeline stage: classify, profile, plan, fill, edit.';
