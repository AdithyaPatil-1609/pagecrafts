import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Commit,
  CommitAuthor,
  CreateCommitResponse,
  FileMap,
  ListCommitsResponse,
} from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { getProjectFiles } from "./project-files";
import { treeSha } from "./tree-hash";

// The commit mirror: reads project commit history from database instead of Git calls.
// recordCommit is the single writer; createCommit (R3 D6) is the explicit-save path that
// derives a content-addressed sha from the working tree and stores that tree in `snapshot`.

// A single project's history is small — a working session is tens of commits, not
// thousands. Capped so one very old project cannot turn a history read into a large
// response; paging past this arrives with the history UI if it is ever needed.
const HISTORY_LIMIT = 200;

// Matches the commits.message column check (1-500 chars).
const MAX_MESSAGE = 500;

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

/**
 * Mirror one commit that already exists, optionally carrying the tree it describes.
 *
 * `snapshot` is the tree as it stood at this commit (R3 D6): restore and publish both need
 * the exact files of a past version, and reading them back out of a commit is one query.
 */
export async function recordCommit(
  supabase: SupabaseClient,
  projectId: string,
  commit: { sha: string; message: string; author: CommitAuthor; snapshot?: FileMap },
): Promise<Commit> {
  // Insert, never upsert. `upsert` compiles to INSERT ... ON CONFLICT DO UPDATE, and
  // Postgres demands UPDATE privilege for that statement whether or not a row actually
  // conflicts. This table grants select and insert only — deliberately, because history is
  // append-only — so every write through upsert came back "permission denied for table
  // commits" against the real database, while passing every test, since the fakes model
  // policies but not grants. Found by scripts/verify-core-loop.ts (R3).
  const { data, error } = await supabase
    .from("commits")
    .insert({
      project_id: projectId,
      sha: commit.sha,
      message: commit.message,
      author: commit.author,
      ...(commit.snapshot ? { snapshot: commit.snapshot } : {}),
    })
    .select("sha, message, author, created_at")
    .maybeSingle();

  if (!error) {
    // RLS refused the insert: the project is not this caller's to write history for.
    if (!data) throw new ApiError("not_found", "That project does not exist.");
    return rowToCommit(data as CommitRow);
  }

  // 23505, unique_violation on (project_id, sha): this commit is already mirrored. That is
  // the idempotency this function promises — a publish retry and a second identical save
  // both land here — so read back what is already recorded rather than failing.
  if (error.code !== "23505") {
    throw new ApiError("internal", "Could not record the commit.", error.message);
  }

  const { data: existing, error: readError } = await supabase
    .from("commits")
    .select("sha, message, author, created_at")
    .eq("project_id", projectId)
    .eq("sha", commit.sha)
    .maybeSingle();

  if (readError) {
    throw new ApiError("internal", "Could not record the commit.", readError.message);
  }
  if (!existing) throw new ApiError("not_found", "That project does not exist.");

  return rowToCommit(existing as CommitRow);
}

/**
 * An explicit save point over the current working tree (POST /projects/{id}/commits).
 *
 * The sha is derived from the file contents rather than issued by a Git layer, so two
 * saves of an identical tree carry the same sha. That is deliberate: pressing Save twice
 * without editing returns the first save rather than stacking a second identical entry in
 * the history sidebar, and the original message is kept rather than silently renamed.
 *
 * `files` is passed by callers that already hold the tree (fork, generation) so the same
 * files are not read back out of the database a second time.
 */
export async function createCommit(
  supabase: SupabaseClient,
  projectId: string,
  message: string,
  author: CommitAuthor = "user",
  files?: FileMap,
): Promise<CreateCommitResponse> {
  // getProjectFiles raises not_found for a project this caller cannot see, which covers
  // the read path; the write path below is covered by recordCommit for the same reason.
  const tree = files ?? (await getProjectFiles(supabase, projectId)).files;
  const sha = treeSha(tree);

  const { data: existing, error: lookupError } = await supabase
    .from("commits")
    .select("sha")
    .eq("project_id", projectId)
    .eq("sha", sha)
    .maybeSingle();

  if (lookupError) {
    throw new ApiError("internal", "Could not read the history.", lookupError.message);
  }
  if (existing) return { sha };

  await recordCommit(supabase, projectId, {
    sha,
    message: message.trim().slice(0, MAX_MESSAGE),
    author,
    snapshot: tree,
  });

  return { sha };
}

/**
 * The exact tree of a past version.
 *
 * Used by restore (D7) and by publish (W3), which both need the files of a chosen version
 * rather than whatever the editor happens to be holding.
 *
 * A commit written before D6 carries no snapshot, and an empty tree is not a site anyone
 * meant to save. Both are refused here rather than handed back, because the caller's next
 * move is to write these files over the user's working tree — returning `{}` would blank
 * their pages and look like the restore had worked.
 */
export async function getCommitSnapshot(
  supabase: SupabaseClient,
  projectId: string,
  sha: string,
): Promise<FileMap> {
  const { data, error } = await supabase
    .from("commits")
    .select("snapshot")
    .eq("project_id", projectId)
    .eq("sha", sha)
    .maybeSingle();

  if (error) throw new ApiError("internal", "Could not read that version.", error.message);
  if (!data) throw new ApiError("not_found", "That version does not exist.");

  const snapshot = (data.snapshot ?? {}) as FileMap;

  if (Object.keys(snapshot).length === 0) {
    throw new ApiError(
      "validation_failed",
      "This version was saved before we started keeping file history, so it cannot be restored.",
      sha,
    );
  }

  return snapshot;
}
