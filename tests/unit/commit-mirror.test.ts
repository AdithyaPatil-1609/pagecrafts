import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { listCommits, recordCommit } from "@/lib/data/commits";
import { ApiError } from "@/lib/errors/respond";
import { dbError, fakeSupabase, none, row, rows } from "../support/fake-supabase";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const SHA = "a1b2c3d4e5f6789012345678901234567890abcd";

const commitRow = (over: Partial<Record<string, unknown>> = {}) => ({
    sha: SHA,
    message: "Save",
    author: "user",
    created_at: "2026-08-08T09:00:00.000Z",
    ...over,
});

describe("listCommits", () => {
    it("maps mirror rows onto the Commit contract", async () => {
        const fake = fakeSupabase({
            projects: row({ id: PROJECT_ID }),
            commits: rows([commitRow()]),
        });

        await expect(listCommits(fake.client, PROJECT_ID)).resolves.toEqual({
            items: [
                {
                    sha: SHA,
                    message: "Save",
                    author: "user",
                    createdAt: "2026-08-08T09:00:00.000Z",
                },
            ],
        });
    });

    it("reads the mirror and nothing else — history is never a live git call (E-6)", async () => {
        const fake = fakeSupabase({ projects: row({ id: PROJECT_ID }), commits: rows([commitRow()]) });

        await listCommits(fake.client, PROJECT_ID);
        expect(fake.queries.map((q) => q.table)).toEqual(["projects", "commits"]);
        expect(fake.queries[1]!.filters.project_id).toBe(PROJECT_ID);
    });

    it("tells 'no commits yet' apart from 'not your project'", async () => {
        const empty = fakeSupabase({ projects: row({ id: PROJECT_ID }), commits: rows([]) });
        await expect(listCommits(empty.client, PROJECT_ID)).resolves.toEqual({ items: [] });

        // RLS shows no project row, so the history must not be answered at all.
        const hidden = fakeSupabase({ projects: none, commits: rows([commitRow()]) });
        await expect(listCommits(hidden.client, PROJECT_ID)).rejects.toMatchObject({
            code: "not_found",
        });
    });

    it("does not query commits at all for a project it cannot see", async () => {
        const fake = fakeSupabase({ projects: none, commits: rows([commitRow()]) });

        await expect(listCommits(fake.client, PROJECT_ID)).rejects.toBeInstanceOf(ApiError);
        expect(fake.queries.map((q) => q.table)).toEqual(["projects"]);
    });

    it("surfaces a database failure as the envelope, not a raw throw", async () => {
        const fake = fakeSupabase({ projects: row({ id: PROJECT_ID }), commits: dbError("timeout") });

        await expect(listCommits(fake.client, PROJECT_ID)).rejects.toMatchObject({
            code: "internal",
        });
    });
});

describe("recordCommit", () => {
    it("mirrors a commit that already exists in git", async () => {
        const fake = fakeSupabase({ commits: row(commitRow({ author: "ai_edit" })) });

        await expect(
            recordCommit(fake.client, PROJECT_ID, { sha: SHA, message: "Save", author: "ai_edit" }),
        ).resolves.toMatchObject({ sha: SHA, author: "ai_edit" });

        const write = fake.queries[0]!;
        expect(write.op).toBe("upsert");
        expect(write.payload).toMatchObject({ project_id: PROJECT_ID, sha: SHA });
    });

    it("is safe to call twice with the same sha — a publish retry must not duplicate history", async () => {
        const fake = fakeSupabase({ commits: row(commitRow()) });
        const commit = { sha: SHA, message: "Save", author: "user" as const };

        const first = await recordCommit(fake.client, PROJECT_ID, commit);
        const second = await recordCommit(fake.client, PROJECT_ID, commit);

        expect(second).toEqual(first);
        expect(fake.queries.every((q) => q.op === "upsert")).toBe(true);
    });

    it("treats an RLS refusal as not_found rather than a silent success", async () => {
        const fake = fakeSupabase({ commits: none });

        await expect(
            recordCommit(fake.client, PROJECT_ID, { sha: SHA, message: "Save", author: "system" }),
        ).rejects.toMatchObject({ code: "not_found" });
    });
});

// The mirror's guarantees live half in SQL. These read the migration rather than a running
// database, which is weaker than `supabase db reset` but catches the edit that quietly
// drops one of them.
describe("the commit-mirror migration", () => {
    const sql = readFileSync(
        join(process.cwd(), "supabase", "migrations", "20260808120000_commit_mirror.sql"),
        "utf8",
    );

    it("closes the author column to the three authors the contract names", () => {
        expect(sql).toMatch(/create type public\.commit_author as enum \('user', 'ai_edit', 'system'\)/);
        expect(sql).toMatch(/alter column author type public\.commit_author/);
    });

    it("orders history totally, so a shared timestamp cannot scramble a page", () => {
        expect(sql).toMatch(/on public\.commits \(project_id, created_at desc, id desc\)/);
    });

    it("ships a rollback, as the database workflow requires", () => {
        const rollback = readFileSync(
            join(process.cwd(), "supabase", "rollback", "20260808120000_commit_mirror.sql"),
            "utf8",
        );
        expect(rollback).toMatch(/drop type if exists public\.commit_author/);
    });

    // The seed runs after the migrations on every `supabase db reset`, so a seeded author
    // outside the enum would break the reset for the whole team rather than just here.
    it("agrees with the seed data's authors", () => {
        const seed = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8");
        const insert = /insert into public\.commits[\s\S]*?on conflict/.exec(seed)?.[0] ?? "";
        const authors = [...insert.matchAll(/,\s*'([a-z_]+)'\s*\)/g)].map((m) => m[1]);

        expect(authors.length).toBeGreaterThan(0);
        for (const author of authors) {
            expect(["user", "ai_edit", "system"], `seeded author "${author}"`).toContain(author);
        }
    });

    it("leaves history append-only: the initial schema grants insert but never update or delete", () => {
        const initial = readFileSync(
            join(process.cwd(), "supabase", "migrations", "20260804120000_initial_schema.sql"),
            "utf8",
        );
        const grant = /grant ([a-z, ]+) on public\.commits to authenticated;/.exec(initial)?.[1];

        expect(grant).toBe("select, insert");
        expect(sql).not.toMatch(/grant (update|delete)[^;]*on public\.commits/);
    });
});
