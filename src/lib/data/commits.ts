import type { SupabaseClient } from "@supabase/supabase-js";
import type { Commit, CommitAuthor, ListCommitsResponse } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";

// The commit mirror: reads project commit history from database instead of Git calls.

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

/** List the project's commit history, newest first. */
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

/** Mirror one commit that already exists in Git. */
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
