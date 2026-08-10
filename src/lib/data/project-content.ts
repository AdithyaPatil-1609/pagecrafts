import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentOp, ContentSchema, Field, PatchContentResponse } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { applyContentOps } from "@/lib/content/apply-ops";

// PATCH /projects/{id}/content (E-1). Ops mutate content_json under the template's
// content_schema; the panel edits structure, never code (C-07). The saved project is
// dirty until the next commit, and `rendered` tells the caller the preview can re-render
// from the new content.

function fieldOf(schema: ContentSchema, path: string): Field | undefined {
  const [sectionKey, fieldKey] = path.split(".");
  return schema.sections
    .find((section) => section.key === sectionKey)
    ?.fields.find((field) => field.key === fieldKey);
}

// Every asset id an op is trying to put into content_json, with the path that carries it —
// scalar image fields, and image fields inside a list's items.
function assetRefs(ops: ContentOp[], schema: ContentSchema): { path: string; id: string }[] {
  const refs: { path: string; id: string }[] = [];

  for (const op of ops) {
    const field = fieldOf(schema, op.path);
    if (!field) continue;

    if (field.type === "image") {
      if (typeof op.value === "string") refs.push({ path: op.path, id: op.value });
      continue;
    }

    if (field.type === "list" && Array.isArray(op.value)) {
      const imageKeys = (field.itemSchema ?? [])
        .filter((f) => f.type === "image")
        .map((f) => f.key);

      op.value.forEach((item, index) => {
        if (item === null || typeof item !== "object") return;
        for (const key of imageKeys) {
          const value = (item as Record<string, unknown>)[key];
          if (typeof value === "string") refs.push({ path: `${op.path}.${index}.${key}`, id: value });
        }
      });
    }
  }

  return refs;
}

/**
 * An image slot may only name an asset this project owns (S-1).
 *
 * applyContentOps checks that an image value is "a string or null" and can do no better:
 * it is pure, and whether an id exists is a question for the database. So until here,
 * `hero.image` accepted any string at all — a deleted asset, a typo, or another project's
 * asset id. Each of those saves cleanly and then fails later, at publish, as a broken
 * image on a live site with nothing in the editor to explain it.
 *
 * The query is scoped by project_id as well as by id, so this is not only a check for
 * "does it exist" but for "is it yours" — and RLS means another owner's row is invisible
 * here anyway, which makes the two answers the same answer.
 */
async function assertAssetsBelongHere(
  supabase: SupabaseClient,
  projectId: string,
  ops: ContentOp[],
  schema: ContentSchema,
): Promise<void> {
  const refs = assetRefs(ops, schema);
  if (refs.length === 0) return;

  // The project's assets, then the comparison in memory — rather than asking the database
  // about the specific ids. A project holds a handful of images (5 MB each, capped), so
  // this is the same single round trip either way, and it sidesteps the case where a typo
  // reaches Postgres as a malformed uuid inside `in (...)` and comes back as 22P02 — a 500
  // for what is plainly a bad request. Here an id that is not a uuid is simply not one of
  // ours, which is both true and the answer the caller needed.
  const { data, error } = await supabase
    .from("assets")
    .select("id")
    .eq("project_id", projectId);

  if (error) throw new ApiError("internal", "Could not check the images.", error.message);

  const known = new Set((data ?? []).map((row) => row.id as string));
  const missing = refs.filter((ref) => !known.has(ref.id));

  if (missing.length > 0) {
    throw new ApiError(
      "validation_failed",
      "Some images are not in this project.",
      missing.map((ref) => `${ref.path}: no such image in this project`).join("; "),
    );
  }
}

export async function patchProjectContent(
  supabase: SupabaseClient,
  projectId: string,
  ops: ContentOp[],
): Promise<PatchContentResponse> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, content_json, content_schema, source_template_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new ApiError("internal", "Could not read the project.", error.message);
  if (!project) throw new ApiError("not_found", "That project does not exist.");

  // The project's own copy, taken at fork (R3 D7). Editing no longer depends on the
  // template row still existing, or on it still saying what it said when the project was
  // made — retiring a design used to leave its projects uneditable.
  let schema = (project.content_schema ?? {}) as ContentSchema;

  // Projects that predate the column, and whose backfill found nothing to copy. Falling
  // back to the template keeps them working exactly as before rather than turning an old
  // project into an error the moment this shipped.
  if (!schema.sections?.length && project.source_template_id) {
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("content_schema")
      .eq("id", project.source_template_id)
      .maybeSingle();

    if (templateError) {
      throw new ApiError("internal", "Could not read the template.", templateError.message);
    }
    if (template) schema = template.content_schema as ContentSchema;
  }

  if (!schema.sections?.length) {
    throw new ApiError(
      "validation_failed",
      "This project has no content schema to edit against.",
    );
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

  await assertAssetsBelongHere(supabase, projectId, ops, schema);

  const { error: saveError } = await supabase
    .from("projects")
    .update({ content_json: next })
    .eq("id", projectId);

  if (saveError) {
    throw new ApiError("internal", "Could not save the edits.", saveError.message);
  }

  return { rendered: true, dirty: true };
}
