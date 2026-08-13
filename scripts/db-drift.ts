import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Has the shared database actually had the migrations run against it? (R3)
//
//   npm run db:drift
//
// CI proves migrations *can* apply: every run builds a fresh database from the files and
// passes. Nothing proves they *have been* applied to the one everyone shares. That gap has
// bitten three times in three days — replace_project_files missing, then templates.tier —
// and each time it surfaced as a confusing runtime failure rather than as a clear answer.
//
// So this asks the live database, directly, whether each thing the code depends on is
// there. It reads with the anon key and writes nothing. Every probe is one of:
//
//   table   - select one row; a missing relation says so
//   column  - select just that column; a missing column says so
//   rpc     - call with arguments that make the function refuse before it writes
//
// Adding to this list is the point. When a migration adds something the code will rely on,
// add a line here in the same PR, and the next run tells everyone whether the database has
// caught up.

// Not named URL: that shadows the global URL constructor, and the host is printed below.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

// Optional, and worth setting: the grants on most tables are to `authenticated`, so a
// signed-out probe gets "permission denied" and cannot tell a missing column from a table
// it was never allowed to read. Signed in, those become real answers. Same account
// verify:loop uses; this script only ever reads.
const EMAIL = process.env.VERIFY_EMAIL?.trim();
const PASSWORD = process.env.VERIFY_PASSWORD?.trim();

// A project id that cannot exist, so functions taking one refuse before touching anything.
const NOWHERE = "00000000-0000-4000-8000-000000000000";

interface Probe {
  /** What the code would break without, in the words a person would use. */
  what: string;
  /** The migration that introduced it, so a missing one names its own fix. */
  since: string;
  run: (db: SupabaseClient) => Promise<{ message: string } | null>;
}

function table(name: string, since: string): Probe {
  return {
    what: `table ${name}`,
    since,
    run: async (db) => (await db.from(name).select("*").limit(1)).error,
  };
}

function column(name: string, col: string, since: string): Probe {
  return {
    what: `${name}.${col}`,
    since,
    // limit(1) rather than limit(0): PostgREST still resolves the column list either way,
    // and a table that happens to be empty must not read as a missing column.
    run: async (db) => (await db.from(name).select(col).limit(1)).error,
  };
}

function fn(name: string, args: Record<string, unknown>, since: string): Probe {
  return {
    what: `function ${name}()`,
    since,
    run: async (db) => {
      const { error } = await db.rpc(name, args);
      // The function exists and refused, which is the answer we wanted. Only "no such
      // function" counts as drift.
      if (error && !isMissing(error.message)) return null;
      return error;
    },
  };
}

/** Distinguishes "the schema has not caught up" from "RLS said no", which is not drift. */
function isMissing(message: string): boolean {
  return /does not exist|schema cache|could not find/i.test(message);
}

const PROBES: Probe[] = [
  table("users", "20260804120000_initial_schema"),
  table("templates", "20260804120000_initial_schema"),
  table("projects", "20260804120000_initial_schema"),
  table("project_files", "20260804120000_initial_schema"),
  table("commits", "20260804120000_initial_schema"),
  table("deployments", "20260804120000_initial_schema"),
  table("generations", "20260804120000_initial_schema"),
  table("assets", "20260804120000_initial_schema"),
  table("entitlements", "20260805160000_entitlements"),
  table("vertical_profiles", "20260812090000_vertical_profiles"),
  table("vertical_profile_aliases", "20260812090000_vertical_profiles"),

  column("commits", "snapshot", "20260808160000_commit_snapshots"),
  column("generations", "provider", "20260809120000_generations_ledger_columns"),
  column("generations", "stage", "20260809120000_generations_ledger_columns"),
  column("generations", "latency_ms", "20260809120000_generations_ledger_columns"),
  column("generations", "prompt_version", "20260809120000_generations_ledger_columns"),
  column("projects", "content_schema", "20260810180000_project_content_schema"),
  column("templates", "tier", "20260811090000_template_tier"),
  column("deployments", "updated_at", "20260811150000_deployment_progress"),

  // Three arguments as of the optimistic-concurrency migration. If the database still has
  // the two-argument version, PostgREST cannot find this signature and reports it as
  // missing — which is exactly the drift worth knowing about.
  fn(
    "replace_project_files",
    { p_project_id: NOWHERE, p_files: {}, p_expected_updated_at: null },
    "20260810120000_files_optimistic_concurrency",
  ),
];

async function main() {
  if (!SUPABASE_URL || !ANON) {
    console.error("\n  NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set\n");
    process.exitCode = 1;
    return;
  }

  const db = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let as = "signed out";

  if (EMAIL && PASSWORD) {
    const { error } = await db.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    if (error) {
      console.error(`\n  could not sign in as ${EMAIL}: ${error.message}`);
      console.error("  carrying on signed out — expect most tables to answer 'permission denied'");
    } else {
      as = `as ${EMAIL}`;
    }
  } else {
    console.error("\n  VERIFY_EMAIL / VERIFY_PASSWORD not set — most tables will answer");
    console.error("  'permission denied' rather than yes or no. Set them for a real answer.");
  }

  const host = new URL(SUPABASE_URL).host;
  console.log(`\n  Checking ${host} ${as}, against ${PROBES.length} things the code expects.\n`);

  const missing: Probe[] = [];
  const unclear: { probe: Probe; message: string }[] = [];

  for (const probe of PROBES) {
    const error = await probe.run(db);

    if (!error) {
      console.log(`  ok       ${probe.what}`);
      continue;
    }

    if (isMissing(error.message)) {
      missing.push(probe);
      console.log(`  MISSING  ${probe.what}`);
      continue;
    }

    // Permission denied, a paused project, a network blip — real, but not schema drift.
    unclear.push({ probe, message: error.message });
    console.log(`  ?        ${probe.what}  (${error.message})`);
  }

  if (unclear.length > 0) {
    console.log("\n  Could not tell for these — usually RLS or a grant, not drift:");
    for (const { probe, message } of unclear) console.log(`    ${probe.what} — ${message}`);
  }

  if (missing.length === 0) {
    console.log("\n  No drift. The shared database matches what the code expects.\n");
    return;
  }

  const migrations = [...new Set(missing.map((p) => p.since))].sort();

  console.log(`\n  ${missing.length} missing. Apply these migrations, in this order:\n`);
  for (const migration of migrations) console.log(`    supabase/migrations/${migration}.sql`);
  console.log("\n  Until then the code will fail at runtime against this database.\n");

  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`\n  failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
