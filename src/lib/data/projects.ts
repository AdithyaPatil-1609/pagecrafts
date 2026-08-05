import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  PatchProjectRequest,
  ProjectDetail,
  ProjectSummary,
  SiteMeta,
} from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";

const DETAIL_COLUMNS =
  "id, name, source_template_id, content_json, site_meta, form_endpoint, updated_at";

interface ProjectRow {
  id: string;
  name: string;
  source_template_id: string | null;
  content_json: Record<string, unknown>;
  site_meta: SiteMeta;
  form_endpoint: string | null;
  updated_at: string;
}

function rowToDetail(row: ProjectRow): ProjectDetail {
  return {
    id: row.id,
    name: row.name,
    status: "draft", // latest-deployment join lands in D2
    liveUrl: null,
    thumbnailUrl: null,
    updatedAt: row.updated_at,
    sourceTemplateId: row.source_template_id,
    contentJson: row.content_json ?? {},
    siteMeta: row.site_meta ?? {},
    formEndpoint: row.form_endpoint,
  };
}

// Owner-scoped by RLS; the explicit user_id filter is defence in depth.
export async function listProjects(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new ApiError("internal", "Could not list your sites.", error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: "draft" as const,
    liveUrl: null,
    thumbnailUrl: null,
    updatedAt: row.updated_at,
  }));
}

// A leaked id belonging to another user returns not_found, never the row (SEC-14, RLS).
export async function getProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectDetail> {
  const { data, error } = await supabase
    .from("projects")
    .select(DETAIL_COLUMNS)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new ApiError("internal", "Could not read the project.", error.message);
  }
  if (!data) throw new ApiError("not_found", "That project does not exist.");

  return rowToDetail(data as ProjectRow);
}

// D1 skeleton: create the project row. Copying template files + the initial commit
// (fork) and the generation path arrive in later days (D7-D8 / E4).
export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  req: CreateProjectRequest,
): Promise<CreateProjectResponse> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: req.name,
      source_template_id: req.sourceTemplateId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new ApiError("internal", "Could not create the project.", error.message);
  }

  return { id: data.id };
}

export async function patchProject(
  supabase: SupabaseClient,
  projectId: string,
  req: PatchProjectRequest,
): Promise<ProjectDetail> {
  const patch: Record<string, unknown> = {};
  if (req.name !== undefined) patch.name = req.name;
  if (req.siteMeta !== undefined) patch.site_meta = req.siteMeta;
  if (req.formEndpoint !== undefined) patch.form_endpoint = req.formEndpoint;

  if (Object.keys(patch).length === 0) {
    return getProject(supabase, projectId);
  }

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new ApiError("internal", "Could not update the project.", error.message);
  }
  if (!data) throw new ApiError("not_found", "That project does not exist.");

  return rowToDetail(data as ProjectRow);
}

// Removes our row only (RLS owner-scoped). A live site keeps serving until its hosting
// entitlement ends (C-12) — that is the deploy layer's concern, not this delete.
export async function deleteProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    throw new ApiError("internal", "Could not remove the project.", error.message);
  }
}
