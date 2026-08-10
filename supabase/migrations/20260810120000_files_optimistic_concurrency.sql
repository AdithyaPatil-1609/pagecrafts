-- R3 D6 — two tabs on one project must not corrupt the tree.
--
-- replace_project_files was already all-or-nothing, but "all or nothing" only protects a
-- single writer. With two editors open on one project the sequence that loses work is:
--
--   tab A reads the tree          tab B reads the same tree
--   tab A saves (adds a section)
--                                 tab B saves the tree it read a minute ago
--
-- B's request is internally consistent, so nothing errors — and because the statement
-- deletes every path not in the request, A's new section is not merely overwritten, it is
-- deleted. The editor shows a successful save to both people.
--
-- The fix is a precondition, not a lock held across the user's thinking time: the caller
-- says which version of the tree it is replacing, and the write is refused if the project
-- has moved on since. p_expected_updated_at is nullable so a caller that genuinely means
-- "replace whatever is there" (the fork path, a script) can still say so by omitting it.
--
-- The check has to live in here rather than in the route. Reading updated_at over one
-- round trip and writing over the next leaves a window between them where the other tab
-- commits, and the check passes against a value that is already stale. Inside the
-- function the `select ... for update` takes a row lock, so a second writer blocks at that
-- line until the first transaction ends and then sees the timestamp the first one wrote.

drop function if exists public.replace_project_files(uuid, jsonb);

create or replace function public.replace_project_files(
  p_project_id uuid,
  p_files jsonb,
  p_expected_updated_at timestamptz default null
)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated_at timestamptz;
  v_current timestamptz;
begin
  -- security invoker: RLS applies, so someone else's project is simply not visible here
  -- and this raises rather than silently writing nothing.
  select p.updated_at into v_current
    from public.projects p
   where p.id = p_project_id
     for update;

  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  if p_expected_updated_at is not null
     and v_current is distinct from p_expected_updated_at then
    raise exception 'stale_write' using errcode = 'P0001';
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

revoke all on function public.replace_project_files(uuid, jsonb, timestamptz) from public;
grant execute on function public.replace_project_files(uuid, jsonb, timestamptz) to authenticated;
