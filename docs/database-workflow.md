# Database workflow

There are two ways to run the schema, and they answer different questions.

## `npm run db:verify` — does the schema build, and do the policies work?

```bash
npm run db:verify
```

No Docker, no daemon, a few seconds. It builds the whole schema from nothing — the platform
prelude, then all twenty migrations in order, then the seed — against Postgres compiled to
WebAssembly, and prints each file with its timing, or stops at the first one that fails and
says how many were never reached.

The behavioural half runs with the rest of the suite:

```bash
npm test tests/db
```

`tests/db/schema.pg.test.ts` exercises the schema as a signed-in person rather than as the
owner of the database: cross-user reads and writes on every table, the privileges that sit in
front of RLS, the CHECK constraints, the file and asset caps, and the seed. `db reset` proves
the migrations *apply*; this proves they *do something*. Those are not the same claim, and
until R3 D16 only the first had ever been made.

`tests/db/fake-db-parity.pg.test.ts` compares `tests/support/fake-db.ts` — which most of the
persistence suite runs against — with the real schema, so the hand-written fake cannot
silently fall behind a migration.

### What it cannot tell you

It is Postgres, not Supabase. The version differs from the hosted one, the platform objects
in `scripts/db/platform-prelude.sql` are our reconstruction of Supabase's rather than
Supabase's own, and GoTrue, PostgREST and Storage are not running. It is the fast check, not
the authoritative one.

## `supabase db reset` — the authoritative one

Install Docker and the Supabase CLI, then:

```bash
supabase start
supabase db reset --local
supabase db lint --local
```

The real platform, the real extensions, the real version. Run this before a release and
whenever a migration touches anything platform-adjacent — auth, storage, roles, extensions.
CI runs it on every pull request in the `database` job.

## New changes

1. Create a timestamped migration in `supabase/migrations/`.
2. Create a matching rollback script in `supabase/rollback/`.
3. If it adds a table, add it to `POLICIES` in `tests/support/fake-db.ts`. The parity test
   will fail until you do — deliberately, because the fake's old behaviour was to invent an
   owner rule for tables it did not know, which hid them from every test that used one.
4. Update `contracts.md`, `docs/openapi.yaml`, and shared types if the change crosses a
   module boundary.
5. Run `npm run db:verify` and `npm test tests/db` before opening a pull request.

## CI

| Job | What it runs | What it proves |
| --- | --- | --- |
| `database` | `supabase db reset --local`, `supabase db lint --local` | the migrations apply and are ordered, on the real platform |
| `quality` | `npm test`, which includes `tests/db/**` | the policies, privileges and constraints behave, on every PR, without Docker |
