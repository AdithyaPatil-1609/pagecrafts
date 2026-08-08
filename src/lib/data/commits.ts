import type { SupabaseClient } from "@supabase/supabase-js";
import type { Commit, CommitAuthor, ListCommitsResponse } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";

// The commit mirror (E-6, V-1).
//
// Git is the truth about a project's history; this table is the copy we read. Version
// history is on screen every time the editor opens, and answering that from the Git layer
// would mean a network call per project per open — so every commit is written here as it
// is made, and reads never touch Git at all.
//
// Two entry points, and they belong to different people. recordCommit() is called by the
// publish/commit side (Adhyay's POST /commits and restore, R3 D6) at the moment a real
// commit exists. listCommits() is the read this whole table exists for.
//
// Writes are additive and that is enforced below the application: the table grants only
// select and insert, so nothing signed in can rewrite or erase history. A restore appends
// a new commit that returns the tree to an older state; it never removes what happened.

// A single project's history is small — a working session is tens of commits, not
// thousands. Capped so one very old project cannot turn a history read into a large
// response; paging past this arrives with the history UI if it is ever needed.
const HISTORY_LIMIT = 200;

interface CommitRow {
    sha: string;
    message: string;
    author: CommitAuthor;
    created_at: string;
}

function rowToCommit(row: CommitRow): Commit {
    return {
        sha: row.sha,
        message: row.message,
        author: row.author,
        createdAt: row.created_at,
    };
}

/**
 * The project's history, newest first.
 *
 * One indexed query on (project_id, created_at desc, id desc) and no Git call. Ordering
 * includes the id because a fork writes its first commit in the same instant as the
 * project row, and two commits sharing a timestamp must still have one stable order.
 *
 * Owner-scoped by RLS: a project belonging to someone else has no visible commits, so a
 * leaked id yields not_found rather than a history.
 */
export async function listCommits(
    supabase: SupabaseClient,
    projectId: string,
): Promise<ListCommitsResponse> {
    // Ask about the project first, so a project that is not yours is not_found rather than
    // an empty history — "no commits yet" and "not your project" are different answers and
    // the editor treats them differently (N-4).
    const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .maybeSingle();

    if (projectError) {
        throw new ApiError("internal", "Could not read the project.", projectError.message);
    }
    if (!project) throw new ApiError("not_found", "That project does not exist.");

    const { data, error } = await supabase
        .from("commits")
        .select("sha, message, author, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(HISTORY_LIMIT);

    if (error) {
        throw new ApiError("internal", "Could not read the history.", error.message);
    }

    return { items: (data ?? []).map((row) => rowToCommit(row as CommitRow)) };
}

/**
 * Mirror one commit that already exists in Git.
 *
 * Called by whoever made the commit, immediately after making it — never speculatively.
 * A row here claims a commit exists, and history is read from here, so writing one before
 * the commit lands would put a sha in the editor's history that Git cannot resolve.
 *
 * Re-mirroring the same sha is not an error. Publish carries an Idempotency-Key and a
 * retried request can reach this point twice with the same commit; the unique
 * (project_id, sha) index makes the second write a no-op rather than a duplicate row or a
 * failed retry.
 */
export async function recordCommit(
    supabase: SupabaseClient,
    projectId: string,
    commit: { sha: string; message: string; author: CommitAuthor },
): Promise<Commit> {
    const { data, error } = await supabase
        .from("commits")
        .upsert(
            {
                project_id: projectId,
                sha: commit.sha,
                message: commit.message,
                author: commit.author,
            },
            { onConflict: "project_id,sha", ignoreDuplicates: false },
        )
        .select("sha, message, author, created_at")
        .maybeSingle();

    if (error) {
        throw new ApiError("internal", "Could not record the commit.", error.message);
    }
    // RLS refused the insert: the project is not this caller's to write history for.
    if (!data) throw new ApiError("not_found", "That project does not exist.");

    return rowToCommit(data as CommitRow);
}
