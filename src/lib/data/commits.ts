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

// The commit mirror (E-6, V-1).
//
// Git is the truth about a project's history; this table is the copy we read. Version
// history is on screen every time the editor opens, and answering that from the Git layer
// would mean a network call per project per open — so every commit is written here as it
// is made, and reads never touch Git at all.
//
// Three entry points. recordCommit() is the single writer. listCommits() is the read this
// whole table exists for. createCommit() (R3 D6) is the explicit-save path: it derives a
// content-addressed sha from the working tree, stores that tree in `snapshot`, and then
// mirrors through recordCommit like everything else.
//
// Writes are additive and that is enforced below the application: the table grants only
// select and insert, so nothing signed in can rewrite or erase history. A restore appends
// a new commit that returns the tree to an older state; it never removes what happened.

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
 * Mirror one commit that already exists, optionally carrying the tree it describes.
 *
 * Called by whoever made the commit, immediately after making it — never speculatively.
 * A row here claims a commit exists, and history is read from here, so writing one before
 * the commit lands would put a sha in the editor's history that Git cannot resolve.
 *
 * Re-mirroring the same sha is not an error. Publish carries an Idempotency-Key and a
 * retried request can reach this point twice with the same commit; the unique
 * (project_id, sha) index makes the second write a no-op rather than a duplicate row or a
 * failed retry.
 *
 * `snapshot` is the tree as it stood at this commit (R3 D6). Restore and publish both need
 * the exact files of a past version, and reading them back out of a commit is one query.
 */
export async function recordCommit(
  supabase: SupabaseClient,
  projectId: string,
  commit: { sha: string; message: string; author: CommitAuthor; snapshot?: FileMap },
): Promise<Commit> {
  const { data, error } = await supabase
    .from("commits")
    .upsert(
      {
        project_id: projectId,
        sha: commit.sha,
        message: commit.message,
        author: commit.author,
        ...(commit.snapshot ? { snapshot: commit.snapshot } : {}),
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

  return (data.snapshot ?? {}) as FileMap;
}