-- Let the app ask which migrations this database has actually had run against it.
--
-- supabase_migrations.schema_migrations is the ledger the CLI keeps, but PostgREST only
-- exposes `public`, so nothing outside the CLI can read it. That is why a database eleven
-- migrations behind looked, from the app, exactly like a database that was up to date --
-- four separate faults in one day, each surfacing as a generic sentence with the real cause
-- invisible until somebody went digging in SQL.
--
-- security definer because the ledger belongs to the CLI's role. It returns version strings
-- and nothing else: no schema, no data, no clue about anyone's account. Execute is granted
-- to authenticated only, so a signed-out visitor cannot enumerate the deploy history.

create or replace function public.applied_migration_versions()
returns setof text
language sql
security definer
set search_path = supabase_migrations, pg_temp
stable
as $$
  select version from schema_migrations order by version;
$$;

revoke execute on function public.applied_migration_versions() from public, anon;
grant execute on function public.applied_migration_versions() to authenticated, service_role;

comment on function public.applied_migration_versions() is
  'Version strings from the migration ledger, so db:drift can tell a behind database from a broken one. Reads nothing else.';
