import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentOp, PatchContentResponse } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { applyContentOps } from "@/lib/content/apply-ops";
import { loadTemplateSchema } from "./template-schema";

// PATCH /projects/{id}/content (E-1). Ops mutate content_json under the template's
// content_schema; the panel edits structure, never code (C-07). The saved project is
// dirty until the next commit, and `rendered` tells the caller the preview can re-render
// from the new content.

export async function patchProjectContent(
  supabase: SupabaseClient,
  projectId: string,
  ops: ContentOp[],
): Promise<PatchContentResponse> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, content_json, source_template_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new ApiError("internal", "Could not read the project.", error.message);
  if (!project) throw new ApiError("not_found", "That project does not exist.");

  if (!project.source_template_id) {
    throw new ApiError(
      "validation_failed",
      "This project has no content schema to edit against.",
    );
  }

  const schema = await loadTemplateSchema(supabase, project.source_template_id);
  if (!schema) {
    throw new ApiError("validation_failed", "This project's template no longer exists.");
  }

  const current = (project.content_json ?? {}) as Record<string, unknown>;

  const { next, issues } = applyContentOps(current, ops, schema);
  if (issues.length > 0) {
    throw new ApiError(
      "validation_failed",
      "Some edits were invalid.",
      issues.map((i) => `${i.path}: ${i.message}`).join("; "),
    );
  }

  const { error: saveError } = await supabase
    .from("projects")
    .update({ content_json: next })
    .eq("id", projectId);

  if (saveError) {
    throw new ApiError("internal", "Could not save the edits.", saveError.message);
  }

  return { rendered: true, dirty: true };
}
