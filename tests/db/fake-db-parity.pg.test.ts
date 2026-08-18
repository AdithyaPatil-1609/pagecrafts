import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { asUser, buildStack, createUser } from "../../scripts/db/stack";
import { TRANSCRIBED_TABLES, createFakeDb } from "../support/fake-db";

// Ties the hand-written fake to the database it claims to imitate.
//
// Most of this repository's persistence tests run against tests/support/fake-db.ts, and
// they are worth exactly as much as its transcription is accurate. Nothing checked that.
// The transcription drifted twice — once by misreading a rule, once by four new tables
// arriving after it was written and never being added — and both times every test stayed
// green, because a fake that is wrong is wrong in the tests too.
//
// So: build a real Postgres from the migrations and compare. This does not make the fake
// correct. It makes it impossible for the fake to be silently incomplete, which is the
// failure that actually happened.

let db: PGlite;

beforeAll(async () => {
    const stack = await buildStack({ seed: false });
    const failed = stack.steps.filter((s) => !s.ok);
    if (failed.length > 0) throw new Error(`${failed[0]!.name} failed:\n${failed[0]!.error}`);
    db = stack.db;
}, 120_000);

afterAll(async () => {
    await db?.close();
});

async function realTables(): Promise<string[]> {
    const rows = await db.query<{ relname: string }>(`
        select c.relname from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r'
         order by 1
    `);
    return rows.rows.map((r) => r.relname);
}

describe("the fake database against the real one", () => {
    it("models every table the migrations create", async () => {
        const missing = (await realTables()).filter((t) => !TRANSCRIBED_TABLES.includes(t));

        // If this fails, a migration added a table and the fake was not told. Add it to
        // POLICIES in tests/support/fake-db.ts with the rule its policy actually uses —
        // do not let it fall through to a default, which is how the last four got hidden.
        expect(missing).toEqual([]);
    });

    it("does not claim tables the migrations never created", async () => {
        const real = await realTables();
        expect(TRANSCRIBED_TABLES.filter((t) => !real.includes(t))).toEqual([]);
    });

    it("agrees with Postgres about which tables are reference data", async () => {
        // The distinction the fake gets wrong when it guesses: a table anybody signed in may
        // read, versus a table scoped to its owner. In Postgres that is a policy whose USING
        // clause is literally `true`.
        const rows = await db.query<{ tablename: string }>(`
            select distinct tablename from pg_policies
             where schemaname = 'public' and cmd = 'SELECT' and qual = 'true'
             order by 1
        `);
        const publicInPostgres = rows.rows.map((r) => r.tablename).sort();
        const publicInFake = TRANSCRIBED_TABLES.filter((t) =>
            ["templates", "vertical_profiles", "vertical_profile_aliases"].includes(t),
        ).sort();

        expect(publicInFake).toEqual(publicInPostgres);
    });

    it("refuses to answer for a table nobody transcribed", async () => {
        // The guard itself, checked by using it. A test asking the fake about an unknown
        // table must get an error naming the table — not an empty result, which is exactly
        // what a correct RLS refusal looks like and is therefore indistinguishable from one.
        const bob = "11111111-1111-1111-1111-111111111111";
        const fake = createFakeDb({ users: [{ id: bob }], something_new: [{ id: "1" }] });

        await expect(
            fake.asUser(bob).from("something_new").select("*"),
        ).rejects.toThrow(/no policy transcribed for "something_new"/);
    });
});

describe("what the fake models, checked against Postgres", () => {
    it("hides another person's rows in both, for the same reason", async () => {
        // The single behaviour the whole persistence suite rests on: RLS does not raise, it
        // returns nothing, and the routes read that silence as not_found (SEC-14). Asserted
        // here on both engines at once so they cannot disagree about it unnoticed.
        const alice = await createUser(db, "parity-alice@example.com");
        const bob = await createUser(db, "parity-bob@example.com");
        const created = await db.query<{ id: string }>(
            "insert into public.projects (user_id, name) values ($1, 'hers') returning id",
            [alice],
        );
        const projectId = created.rows[0]!.id;

        const fromPostgres = await asUser(db, bob, () =>
            db.query("select * from public.projects where id = $1", [projectId]),
        );

        const fake = createFakeDb({
            users: [{ id: alice }, { id: bob }],
            projects: [{ id: projectId, user_id: alice, name: "hers" }],
        });
        const fromFake = await fake.asUser(bob).from("projects").select("*").eq("id", projectId);

        expect(fromPostgres.rows).toEqual([]);
        expect(fromFake.data).toEqual([]);
        expect(fromFake.error).toBeNull();
    });

    it("shows reference data to anybody signed in, in both", async () => {
        const bob = await createUser(db, "parity-ref@example.com");
        await db.exec(`
            insert into public.vertical_profiles (slug, profile)
            values ('cafe-owner', '{"label":"Cafe","recipe":{},"artDirection":{}}'::jsonb)
        `);

        const fromPostgres = await asUser(db, bob, () =>
            db.query("select slug from public.vertical_profiles"),
        );

        const fake = createFakeDb({
            users: [{ id: bob }],
            vertical_profiles: [{ slug: "cafe-owner" }],
        });
        const fromFake = await fake.asUser(bob).from("vertical_profiles").select("slug");

        // Before this reconciliation the fake returned [] here while Postgres returned the
        // row — the exact shape of a test that passes against a table it cannot see.
        expect(fromPostgres.rows).toHaveLength(1);
        expect(fromFake.data).toHaveLength(1);
    });
});
