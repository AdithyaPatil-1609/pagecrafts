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

const MAX_MESSAGE = 500;
const HISTORY_PAGE = 100;

// RLS already hides other people's projects; this turns "no rows" into not_found
// so a leaked id is indistinguishable from a made-up one (SEC-14).
async function requireProject(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new ApiError("internal", "Could not read the project.", error.message);
  if (!data) throw new ApiError("not_found", "That project does not exist.");
}

// GET /projects/{id}/commits — newest first. History is insert-only and additive:
// nothing here is ever updated or deleted (V-1, BR-15).
export async function listCommits(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ListCommitsResponse> {
  await requireProject(supabase, projectId);

  const { data, error } = await supabase
    .from("commits")
    .select("sha, message, author, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_PAGE);

  if (error) throw new ApiError("internal", "Could not read the history.", error.message);

  const items: Commit[] = (data ?? []).map((row) => ({
    sha: row.sha as string,
    message: row.message as string,
    author: row.author as CommitAuthor,
    createdAt: row.created_at as string,
  }));

  return { items };
}

// POST /projects/{id}/commits — an explicit save point over the current working tree.
// Pass `files` when the caller already has the tree in hand (fork, generation) to
// avoid a second read. An unchanged tree returns the existing sha rather than
// stacking identical entries in the sidebar.
export async function createCommit(
  supabase: SupabaseClient,
  projectId: string,
  message: string,
  author: CommitAuthor = "user",
  files?: FileMap,
): Promise<CreateCommitResponse> {
  await requireProject(supabase, projectId);

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

  const { error } = await supabase.from("commits").insert({
    project_id: projectId,
    sha,
    message: message.trim().slice(0, MAX_MESSAGE),
    author,
    snapshot: tree,
  });

  if (error) throw new ApiError("internal", "Could not save this version.", error.message);

  return { sha };
}

// Used by restore (D7) and by publish (W3), which both need the exact tree of a
// past version rather than whatever is in the editor right now.
export async function getCommitSnapshot(
  supabase: SupabaseClient,
  projectId: string,
  sha: string,
): Promise<FileMap> {
  await requireProject(supabase, projectId);

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
