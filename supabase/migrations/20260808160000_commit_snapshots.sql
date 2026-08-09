-- D6 · E5 · version history foundation
-- 1. commits carry the tree they describe, so restore has something to restore from.
-- 2. the working tree is replaced in one statement, so a crash cannot half-save a site.

alter table public.commits
  add column if not exists snapshot jsonb not null default '{}'::jsonb;

comment on column public.commits.snapshot is
  'FileMap (path -> text) as it stood at this commit. Bounded by the 50 file / 2 MB project ceiling.';

-- Path shape, enforced at the database as well as in validate-file-map.ts.
alter table public.project_files
  drop constraint if exists project_files_path_shape;

alter table public.project_files
  add constraint project_files_path_shape check (
    char_length(path) between 1 and 200
    and path !~ '\\'
    and path !~ '//'
    and path ~ '^[A-Za-z0-9._/-]+$'
  ) not valid;

alter table public.project_files
  validate constraint project_files_path_shape;

-- Atomic whole-tree replace. security invoker keeps RLS in force, so a call against
-- someone else's project sees no project row and raises project_not_found.
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
