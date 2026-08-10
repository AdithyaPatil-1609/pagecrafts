-- Rollback for 20260810120000_files_optimistic_concurrency.sql
--
-- Restores the two-argument function exactly as 20260808160000_commit_snapshots.sql left
-- it, so a project rolled back to that migration still has a working file write. Dropping
-- the three-argument form first, because the two differ in signature and would otherwise
-- both exist as overloads.

drop function if exists public.replace_project_files(uuid, jsonb, timestamptz);

create or replace function public.replace_project_files(
  p_project_id uuid,
  p_files jsonb
)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated_at timestamptz;
begin
  if not exists (select 1 from public.projects where id = p_project_id) then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  delete from public.project_files f
   where f.project_id = p_project_id
     and not (p_files ? f.path);

  insert into public.project_files (project_id, path, content)
  select p_project_id, e.key, e.value
    from jsonb_each_text(p_files) as e(key, value)
  on conflict (project_id, path) do update
     set content = excluded.content,
         updated_at = now()
   where public.project_files.content is distinct from excluded.content;

  update public.projects
     set updated_at = now()
   where id = p_project_id
  returning updated_at into v_updated_at;

  return v_updated_at;
end;
$$;

revoke all on function public.replace_project_files(uuid, jsonb) from public;
grant execute on function public.replace_project_files(uuid, jsonb) to authenticated;
