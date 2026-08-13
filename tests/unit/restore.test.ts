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

// The working tree is written by replace_project_files(), not by statements against
// project_files — so what a restore wrote is read off the rpc call, not off the queries.
const writesTheTree = { replace_project_files: () => ({ data: NOW, error: null }) };

function withCommits(snapshot: unknown | undefined) {
    return fakeSupabase(
        {
            commits: commitsTable(snapshot),
            projects: row({ id: PROJECT_ID, updated_at: NOW }),
            project_files: none,
        },
        writesTheTree,
    );
}

describe("restoreProject", () => {
    it("writes the chosen version's files back and reports the sha it landed on", async () => {
        const fake = withCommits(TREE);

        const result = await restoreProject(fake.client, PROJECT_ID, SHA);

        expect(result).toEqual({ newSha: SHA });
        expect(fake.rpcs).toHaveLength(1);
        expect(fake.rpcs[0]).toEqual({
            name: "replace_project_files",
            // No precondition: a restore is an explicit "make it look like this commit
            // again", so it replaces whatever is in the tree rather than refusing when the
            // tree has moved on (R3 D6).
            args: { p_project_id: PROJECT_ID, p_files: TREE, p_expected_updated_at: null },
        });
    });

    it("records the restore as a system commit, naming the version it went back to", async () => {
        const fake = withCommits(TREE);

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
        const fake = withCommits(TREE);

        await restoreProject(fake.client, PROJECT_ID, SHA);

        const destructive = fake.queries.filter(
            (q) => q.table === "commits" && (q.op === "update" || q.op === "delete"),
        );
        expect(destructive).toEqual([]);
    });

    it("refuses a version that carries no snapshot, and writes nothing", async () => {
        const fake = withCommits(null);

        await expect(restoreProject(fake.client, PROJECT_ID, SHA)).rejects.toMatchObject({
            code: "validation_failed",
        });

        expect(fake.rpcs).toEqual([]);
    });

    it("refuses a version this caller cannot see, and writes nothing (SEC-14)", async () => {
        const fake = withCommits(undefined);

        await expect(restoreProject(fake.client, PROJECT_ID, SHA)).rejects.toMatchObject({
            code: "not_found",
        });

        expect(fake.rpcs).toEqual([]);
    });

    it("refuses a snapshot that does not hash back to its own sha", async () => {
        const fake = withCommits({ "index.html": "<h1>something else</h1>" });

        await expect(restoreProject(fake.client, PROJECT_ID, SHA)).rejects.toMatchObject({
            code: "internal",
        });
    });
});
