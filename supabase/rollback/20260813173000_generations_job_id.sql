drop index if exists public.generations_job_id_idx;

alter table public.generations
  drop constraint if exists generations_job_id_check;

alter table public.generations
  drop column if exists job_id;
