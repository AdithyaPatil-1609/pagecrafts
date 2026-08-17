import { describe, expect, it } from "vitest";

import { createProject, patchProject } from "@/lib/data/projects";
import { deleteProjectFile, putProjectFile, putProjectFiles } from "@/lib/data/project-files";
import { clientFault } from "@/lib/data/pg-errors";
import { createFakeDb } from "../support/fake-db";
import { dbError, fakeSupabase, row } from "../support/fake-supabase";

// The R3 D5 bug sweep. Each test here is a defect the acceptance found, kept so it cannot
// come back.

describe("touching a project has something to set", () => {
    // The bug: the working tree was touched with `{ name: undefined }` to fire the
    // set_updated_at trigger. supabase-js serialises with JSON.stringify, which drops
    // undefined, so PostgREST received `{}` — an update with no columns — and every file
    // write failed with a 500. Nothing in the D3 tests caught it, because none of them
    // reached the database.
    function project() {
        const db = createFakeDb({ users: [{ id: "u1" }] });
        const created = db.insert("projects", {
            user_id: "u1",
            name: "Kettle & Co.",
            updated_at: "2026-08-01T00:00:00.000Z",
        });
        return { db, id: created.id as string };
    }

    it("writes the whole tree and returns a fresh timestamp", async () => {
        const { db, id } = project();

        const result = await putProjectFiles(db.asUser("u1"), id, { "index.html": "<h1>hi</h1>" });

        expect(result.files).toEqual({ "index.html": "<h1>hi</h1>" });
        expect(result.updatedAt).not.toBe("2026-08-01T00:00:00.000Z");
    });

    it("writes one file and marks the tree dirty", async () => {
        const { db, id } = project();

        await expect(putProjectFile(db.asUser("u1"), id, "index.html", "<h1>hi</h1>")).resolves.toMatchObject({
            path: "index.html",
            dirty: true,
        });
    });

    it("deletes one file and marks the tree dirty", async () => {
        const { db, id } = project();
        await putProjectFile(db.asUser("u1"), id, "index.html", "<h1>hi</h1>");

        await expect(deleteProjectFile(db.asUser("u1"), id, "index.html")).resolves.toMatchObject({
            dirty: true,
        });
        expect(db.rows("project_files")).toHaveLength(0);
    });

    it("moves the project up the dashboard when a file is written", async () => {
        const { db, id } = project();
        const before = db.rows("projects")[0]!.updated_at;

        await putProjectFile(db.asUser("u1"), id, "index.html", "x");

        expect(db.rows("projects")[0]!.updated_at).not.toBe(before);
    });
});

// `internal` is a promise that the fault was ours and a retry might work. Saying it about a
// bad request sends the caller to wait for a fix that is never coming.
describe("a bad request is not reported as our failure", () => {
    it("a template that no longer exists is not_found, not internal", async () => {
        // The gallery can only fork a library design. An id that is not in the library
        // (and not in the table) is a missing design, not a broken server.
        const fake = fakeSupabase({
            entitlements: () => ({ data: [], error: null }),
            templates: () => ({ data: null, error: null }),
            projects: () => ({ data: [], error: null }),
        });

        await expect(
            createProject(fake.client, "u1", { name: "New site", sourceTemplateId: "missing" }),
        ).rejects.toMatchObject({
            code: "not_found",
            message: "That design does not exist.",
        });
    });

    it("a value the schema forbids is validation_failed on patch too", async () => {
        const fake = fakeSupabase({
            projects: dbError('new row violates check constraint "projects_form_endpoint_check"'),
        });

        await expect(
            patchProject(fake.client, "p1", { formEndpoint: "https://forms.example/x" }),
        ).rejects.toMatchObject({ code: "validation_failed" });
    });

    it("a genuine failure is still internal", async () => {
        const fake = fakeSupabase({ projects: dbError("connection reset by peer") });

        await expect(createProject(fake.client, "u1", { name: "New site" })).rejects.toMatchObject({
            code: "internal",
        });
    });

    it("keeps the database's own words as detail, for the log", async () => {
        const fake = fakeSupabase({ projects: dbError("duplicate key value violates unique constraint") });

        await expect(createProject(fake.client, "u1", { name: "x" })).rejects.toMatchObject({
            detail: "duplicate key value violates unique constraint",
        });
    });

    it("does not swallow a successful create", async () => {
        const fake = fakeSupabase({ projects: row({ id: "p1" }) });
        await expect(createProject(fake.client, "u1", { name: "x" })).resolves.toEqual({ id: "p1" });
    });
});

describe("clientFault", () => {
    it("recognises constraint violations by SQLSTATE", () => {
        for (const code of ["23503", "23505", "23514", "22001"]) {
            expect(clientFault({ code, message: "" })?.code, code).toBe("validation_failed");
        }
    });

    it("recognises them by message when no SQLSTATE arrives", () => {
        expect(clientFault({ message: "violates foreign key constraint" })?.code).toBe("validation_failed");
        expect(clientFault({ message: "value too long for type character varying(80)" })?.code).toBe(
            "validation_failed",
        );
    });

    it("leaves anything else alone — that one really is ours", () => {
        expect(clientFault({ code: "08006", message: "connection failure" })).toBeNull();
        expect(clientFault({ message: "timeout" })).toBeNull();
    });
});
