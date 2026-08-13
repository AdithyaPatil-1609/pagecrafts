-- A generation contains several provider invocations. D17/D20 reporting must
-- group those rows exactly; user + minute is only a heuristic and merges two
-- quick retries into one generation.

alter table public.generations
  add column if not exists job_id text;

alter table public.generations
  add constraint generations_job_id_check
  check (job_id is null or job_id ~ '^job_[A-Za-z0-9_-]+$');

create index if not exists generations_job_id_idx
  on public.generations (job_id)
  where job_id is not null;

comment on column public.generations.job_id is
  'Generation job whose provider invocation produced this row.';
