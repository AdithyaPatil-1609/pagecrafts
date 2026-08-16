import { buildStack, migrationFiles } from "./db/stack";

// `npm run db:verify` — build the whole schema from nothing and say what happened.
//
// The one command to reach for when a migration is added or changed. It is the local stand-in
// for `supabase db reset` on a machine without Docker, and it runs in CI, where there has
// never been anything that executes a migration at all.

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

async function main() {
    const files = migrationFiles();
    console.log(`\n${files.length} migrations, applied in order, against Postgres.\n`);

    const { db, steps } = await buildStack({ seed: true });

    for (const step of steps) {
        const mark = step.ok ? `${GREEN}ok${OFF}` : `${RED}FAILED${OFF}`;
        console.log(`  ${mark}  ${step.name} ${DIM}${step.ms.toFixed(0)}ms${OFF}`);
        if (step.error) console.log(`\n${RED}${step.error}${OFF}\n`);
    }

    const failed = steps.filter((s) => !s.ok);
    const applied = steps.filter((s) => s.ok && s.name.endsWith(".sql") && s.name !== "seed.sql");

    if (failed.length > 0) {
        const stopped = steps.length < files.length + 1;
        console.log(
            `\n${RED}Stopped at ${failed[0]!.name}.${OFF}` +
                (stopped ? ` ${files.length + 1 - steps.length} later migrations were not reached.` : ""),
        );
        await db.close();
        process.exit(1);
    }

    // A schema that builds is not the same as a schema that is right. Print the shape of what
    // came out, so a reviewer can see at a glance whether it is the schema they expected.
    const summary = await db.query<{ tables: number; policies: number; unprotected: number }>(`
        select
            (select count(*)::int from pg_tables where schemaname = 'public') as tables,
            (select count(*)::int from pg_policies where schemaname = 'public') as policies,
            (select count(*)::int from pg_tables t
               join pg_class c on c.relname = t.tablename
               join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
              where t.schemaname = 'public' and not c.relrowsecurity) as unprotected
    `);
    const { tables, policies, unprotected } = summary.rows[0]!;

    console.log(
        `\n${GREEN}All ${applied.length} migrations and the seed applied.${OFF}\n` +
            `  ${tables} tables · ${policies} policies · ` +
            (unprotected === 0
                ? `${GREEN}row security on every table${OFF}`
                : `${RED}${unprotected} without row security${OFF}`),
    );

    await db.close();
    if (unprotected > 0) process.exit(1);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
