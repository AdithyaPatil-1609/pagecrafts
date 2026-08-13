import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentSchema } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";

// A project's content schema is its template's, copied by reference rather than by value:
// the panel and the write path must read the same one, or the panel would offer a field the
// route then refuses. One loader, used by both.

export async function loadTemplateSchema(
  supabase: SupabaseClient,
  templateId: string,
): Promise<ContentSchema | null> {
  const { data, error } = await supabase
    .from("templates")
    .select("content_schema")
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw new ApiError("internal", "Could not read the template.", error.message);
  if (!data) return null;

  const schema = data.content_schema as ContentSchema | null;
  return schema && Array.isArray(schema.sections) ? schema : null;
}

/**
 * The same lookup for a project that may have no template at all. A generated project has
 * none yet; the editor falls back to the code view rather than showing an empty panel.
 */
export async function loadProjectSchema(
  supabase: SupabaseClient,
  sourceTemplateId: string | null,
): Promise<ContentSchema | null> {
  if (!sourceTemplateId) return null;
  return loadTemplateSchema(supabase, sourceTemplateId);
}
