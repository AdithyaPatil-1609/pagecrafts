import type { SupabaseClient } from "@supabase/supabase-js";
import type { RestoreResponse } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { createCommit, getCommitSnapshot } from "./commits";
import { putProjectFiles } from "./project-files";

// Restore (R3 D7 · FR-075, BR-15).
//
// Going back is a move forward. The chosen version's files are written over the working
// tree and a commit is recorded on top; nothing in `commits` is updated or deleted, and the
// table only grants select and insert, so it could not be otherwise. A user who restores to
// Monday and changes their mind can still restore to Tuesday, because Tuesday is still
// there.
//
// The order matters. The snapshot is read and validated before anything is written, so a
// commit that pre-dates snapshots — or one belonging to someone else — leaves the working
// tree exactly as it was. Restore either replaces the tree or does nothing to it.

const SHORT_SHA = 7;

/**
 * Put the project's files back to how they stood at `sha`.
 *
 * Returns the sha the project now sits at. Because a sha is derived from file contents,
 * that is the same sha that was restored to: the tree is byte-identical, so it hashes to
 * the same value, and the unique (project_id, sha) index means no second row is written.
 * History is unchanged and complete either way — see the note in the D7 PR.
 */
export async function restoreProject(
  supabase: SupabaseClient,
  projectId: string,
  sha: string,
): Promise<RestoreResponse> {
  // Raises not_found for a commit that is not this caller's, and validation_failed for one
  // written before snapshots existed. Nothing has been written at this point.
  const snapshot = await getCommitSnapshot(supabase, projectId, sha);

  await putProjectFiles(supabase, projectId, snapshot);

  const { sha: newSha } = await createCommit(
    supabase,
    projectId,
    `Restored to ${sha.slice(0, SHORT_SHA)}`,
    "system",
    snapshot,
  );

  // The tree that came out of the commit should hash back to the commit it came from. If it
  // does not, the stored snapshot and its sha disagree, and the safest thing is to say so
  // rather than let a mislabelled version sit in the user's history.
  if (newSha !== sha) {
    throw new ApiError(
      "internal",
      "Could not restore that version.",
      `snapshot of ${sha} hashed to ${newSha}`,
    );
  }

  return { newSha };
}
