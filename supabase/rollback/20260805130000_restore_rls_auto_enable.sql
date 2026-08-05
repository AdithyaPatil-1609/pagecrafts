create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  command record;
begin
  for command in
    select object_identity
    from pg_event_trigger_ddl_commands()
    where object_type = 'table'
      and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', command.object_identity);
  end loop;
end;
$$;
