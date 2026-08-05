# Database workflow

## Local setup

Install Docker and the Supabase CLI, then run:

```bash
supabase start
supabase db reset --local
supabase db lint --local
```

`supabase db reset --local` rebuilds the local database, applies each migration in order, and loads `supabase/seed.sql`.

## New changes

1. Create a timestamped migration in `supabase/migrations/`.
2. Create a matching rollback script in `supabase/rollback/`.
3. Update `contracts.md`, `docs/openapi.yaml`, and shared types if the change crosses a module boundary.
4. Run the local commands above before opening a pull request.

## CI

The database CI job starts Supabase, resets the database with the migration and seed files, and runs the Supabase linter. This ensures migrations remain ordered and executable.
