import { describe, expect, it } from "vitest";

import { restoreProject } from "@/lib/data/restore";
import { treeSha } from "@/lib/data/tree-hash";
import { fakeSupabase, none, row, type Query, type TableResponder } from "../support/fake-supabase";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-08-09T10:00:00.000Z";

const TREE = { "index.html": "<h1>Monday</h1>", "styles.css": "body{}" };
const SHA = treeSha(TREE);

/**
 * The commits table answers three questions during a restore, in order: what tree does this
 * sha hold, does this sha already exist, and here is the row you just wrote. `snapshot`
 * undefined stands for a sha nobody can see; null stands for a commit written before
 * snapshots existed.
 */
function commitsTable(snapshot: unknown | undefined): TableResponder {
    let reads = 0;

    return (query: Query) => {
        if (query.op === "upsert") {
            return {
                data: { sha: SHA, message: `Restored to ${SHA.slice(0, 7)}`, author: "system", created_at: NOW },
                error: null,
            };
        }

        reads += 1;
        // 1: getCommitSnapshot. 2: createCommit checking whether this sha is already here.
        if (reads === 1) {
            return { data: snapshot === undefined ? null : { snapshot }, error: null };
        }
        return { data: null, error: null };
    };
}

const projectsTable = row({ id: PROJECT_ID, updated_at: NOW });

describe("restoreProject", () => {
    it("writes the chosen version's files back and reports the sha it landed on", async () => {
        const fake = fakeSupabase({
            commits: commitsTable(TREE),
            projects: projectsTable,
            project_files: none,
        });

        const result = await restoreProject(fake.client, PROJECT_ID, SHA);

        expect(result).toEqual({ newSha: SHA });

        const written = fake.queries.find((q) => q.table === "project_files" && q.op === "upsert");
        expect(written?.payload).toEqual([
            { project_id: PROJECT_ID, path: "index.html", content: "<h1>Monday</h1>" },
            { project_id: PROJECT_ID, path: "styles.css", content: "body{}" },
        ]);
    });

    it("records the restore as a system commit, naming the version it went back to", async () => {
        const fake = fakeSupabase({
            commits: commitsTable(TREE),
            projects: projectsTable,
            project_files: none,
        });

        await restoreProject(fake.client, PROJECT_ID, SHA);

        const mirrored = fake.queries.find((q) => q.table === "commits" && q.op === "upsert");
        expect(mirrored?.payload).toMatchObject({
            project_id: PROJECT_ID,
            author: "system",
            message: `Restored to ${SHA.slice(0, 7)}`,
            snapshot: TREE,
        });
    });

    it("never updates or deletes history — restore is additive (BR-15)", async () => {
        const fake = fakeSupabase({
            commits: commitsTable(TREE),
            projects: projectsTable,
            project_files: none,
        });

        await restoreProject(fake.client, PROJECT_ID, SHA);

        const destructive = fake.queries.filter(
            (q) => q.table === "commits" && (q.op === "update" || q.op === "delete"),
        );
        expect(destructive).toEqual([]);
    });

    it("refuses a version that carries no snapshot, and writes nothing", async () => {
        const fake = fakeSupabase({
            commits: commitsTable(null),
            projects: projectsTable,
            project_files: none,
        });

        await expect(restoreProject(fake.client, PROJECT_ID, SHA)).rejects.toMatchObject({
            code: "validation_failed",
        });

        expect(fake.queries.filter((q) => q.table === "project_files")).toEqual([]);
    });

    it("refuses a version this caller cannot see, and writes nothing (SEC-14)", async () => {
        const fake = fakeSupabase({
            commits: commitsTable(undefined),
            projects: projectsTable,
            project_files: none,
        });

        await expect(restoreProject(fake.client, PROJECT_ID, SHA)).rejects.toMatchObject({
            code: "not_found",
        });

        expect(fake.queries.filter((q) => q.table === "project_files")).toEqual([]);
    });

    it("refuses a snapshot that does not hash back to its own sha", async () => {
        const fake = fakeSupabase({
            commits: commitsTable({ "index.html": "<h1>something else</h1>" }),
            projects: projectsTable,
            project_files: none,
        });

        await expect(restoreProject(fake.client, PROJECT_ID, SHA)).rejects.toMatchObject({
            code: "internal",
        });
    });
});
