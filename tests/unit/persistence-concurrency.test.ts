import { describe, expect, it } from "vitest";

import { putProjectFiles } from "@/lib/data/project-files";
import { putFilesSchema } from "@/lib/contracts/schemas";
import { statusFor } from "@/lib/errors/codes";
import { createFakeDb } from "../support/fake-db";

// R3 D6 — two tabs on one project must not corrupt the tree.
//
// PUT /files replaces the whole tree: every path not in the request is deleted. That is
// correct for one writer and destructive for two, because the second tab's request is
// internally consistent and nothing about it looks wrong. The precondition is what makes
// the difference between "your save overwrote mine" and "your save was refused".
//
// Every timestamp here is a fixed one seeded into the row rather than a second reading of
// the clock. Two writes inside the same millisecond would otherwise produce equal
// timestamps and the test would pass or fail on how fast the machine is.
const OPENED_AT = "2026-08-01T00:00:00.000Z";

function project(files: Record<string, string> = {}) {
    const db = createFakeDb({ users: [{ id: "u1" }] });
    const created = db.insert("projects", {
        user_id: "u1",
        name: "Kettle & Co.",
        updated_at: OPENED_AT,
    });
    const id = created.id as string;

    for (const [path, content] of Object.entries(files)) {
        db.insert("project_files", { project_id: id, path, content });
    }

    return { db, id };
}

describe("two tabs on one project", () => {
    it("refuses the second save when the tree has moved on, and writes nothing", async () => {
        const { db, id } = project({ "index.html": "<h1>original</h1>" });
        const user = db.asUser("u1");

        // Both tabs opened the project at OPENED_AT. The first one saves and adds a page.
        await putProjectFiles(
            user,
            id,
            { "index.html": "<h1>original</h1>", "about.html": "<h1>about</h1>" },
            OPENED_AT,
        );

        // The second tab still believes the tree is the one it read, and its request does
        // not mention about.html — so an unconditional write would delete it.
        await expect(
            putProjectFiles(user, id, { "index.html": "<h1>edited elsewhere</h1>" }, OPENED_AT),
        ).rejects.toMatchObject({ code: "conflict" });

        // The point of the whole feature: the first tab's page is still there, and the
        // refused write did not land even partially.
        const paths = db.rows("project_files").map((f) => f.path).sort();
        expect(paths).toEqual(["about.html", "index.html"]);
        expect(
            db.rows("project_files").find((f) => f.path === "index.html")!.content,
        ).toBe("<h1>original</h1>");
    });

    it("lets the save through when the caller holds the current version", async () => {
        const { db, id } = project({ "index.html": "<h1>original</h1>" });
        const user = db.asUser("u1");

        const first = await putProjectFiles(user, id, { "index.html": "<h1>one</h1>" }, OPENED_AT);

        // Saving again with the timestamp the last save handed back is the normal path: an
        // editor that keeps its copy of updatedAt current can save as often as it likes.
        await expect(
            putProjectFiles(user, id, { "index.html": "<h1>two</h1>" }, first.updatedAt),
        ).resolves.toMatchObject({ files: { "index.html": "<h1>two</h1>" } });
    });

    it("replaces unconditionally when no precondition is given", async () => {
        // Fork and restore mean "make the tree look like this", not "merge with whatever is
        // there", so they deliberately keep the old last-writer-wins behaviour. Left as a
        // test so that staying permissive is a decision rather than an oversight.
        const { db, id } = project({ "index.html": "<h1>original</h1>", "about.html": "<h1>about</h1>" });

        const result = await putProjectFiles(db.asUser("u1"), id, { "index.html": "<h1>replaced</h1>" });

        expect(result.files).toEqual({ "index.html": "<h1>replaced</h1>" });
        expect(db.rows("project_files").map((f) => f.path)).toEqual(["index.html"]);
    });

    it("reports a stale save as 409, not as a bad request", () => {
        // The request is well formed and would have succeeded a moment earlier, so 422
        // would send the editor looking for a fault in what it sent. 409 says the tree
        // moved, which is the thing it can actually act on.
        expect(statusFor("conflict")).toBe(409);
        expect(statusFor("validation_failed")).toBe(422);
    });
});

describe("the precondition on the wire", () => {
    it("accepts an ISO timestamp and is optional", () => {
        expect(putFilesSchema.safeParse({ files: {} }).success).toBe(true);
        expect(
            putFilesSchema.safeParse({ files: {}, expectedUpdatedAt: OPENED_AT }).success,
        ).toBe(true);
    });

    it("rejects something that is not a timestamp rather than ignoring it", () => {
        // A precondition that silently fails to parse is worse than none: the caller
        // believes it is protected and is not.
        expect(putFilesSchema.safeParse({ files: {}, expectedUpdatedAt: "yesterday" }).success)
            .toBe(false);
    });
});
