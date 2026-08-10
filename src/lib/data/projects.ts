import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DeploymentState,
  ProjectStatus,
  ContentSchema,
  CreateProjectRequest,
  CreateProjectResponse,
  FileMap,
  PatchProjectRequest,
  ProjectDetail,
  ProjectSummary,
  SiteMeta,
} from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { clientFault } from "./pg-errors";
import { putProjectFiles } from "./project-files";
import { createCommit } from "./commits";
import { contentFromFiles } from "@/lib/content/from-files";

const DETAIL_COLUMNS =
  "id, name, source_template_id, content_json, content_schema, site_meta, form_endpoint, updated_at, " +
  "deployments(status, live_url, created_at)";

const SUMMARY_COLUMNS = "id, name, updated_at, deployments(status, live_url, created_at)";

interface DeploymentRow {
  status: DeploymentState;
  live_url: string | null;
  created_at: string;
}

// Newest attempt wins. One row per publish attempt, success and failure alike (V-7),
// so the dashboard shows a failed publish without the user opening the project.
function latestDeployment(rows: DeploymentRow[] | null | undefined): DeploymentRow | null {
  if (!rows || rows.length === 0) return null;
  return rows.reduce((a, b) => (a.created_at >= b.created_at ? a : b));
}

function statusOf(rows: DeploymentRow[] | null | undefined): ProjectStatus {
  return latestDeployment(rows)?.status ?? "draft";
}

// C-05: never surface a URL that has not been confirmed to respond. The database
// CHECK guarantees live_url is non-null when status is 'live'; anything else shows nothing.
function liveUrlOf(rows: DeploymentRow[] | null | undefined): string | null {
  const d = latestDeployment(rows);
  return d && d.status === "live" ? d.live_url : null;
}

interface ProjectRow {
  id: string;
  name: string;
  source_template_id: string | null;
  content_json: Record<string, unknown>;
  content_schema: ContentSchema | null;
  site_meta: SiteMeta;
  form_endpoint: string | null;
  updated_at: string;
  deployments?: DeploymentRow[] | null;
}

function rowToDetail(row: ProjectRow): ProjectDetail {
  return {
    id: row.id,
    name: row.name,
    status: statusOf(row.deployments),
    liveUrl: liveUrlOf(row.deployments),
    thumbnailUrl: null,
    updatedAt: row.updated_at,
    sourceTemplateId: row.source_template_id,
    contentJson: row.content_json ?? {},
    contentSchema: row.content_schema ?? { sections: [] },
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
    .select(SUMMARY_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new ApiError("internal", "Could not list your sites.", error.message);
  }

  return (data ?? []).map((row) => {
    const r = row as unknown as ProjectRow;
    return {
      id: r.id,
      name: r.name,
      status: statusOf(r.deployments),
      liveUrl: liveUrlOf(r.deployments),
      thumbnailUrl: null,
      updatedAt: r.updated_at,
    };
  });
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

  return rowToDetail(data as unknown as ProjectRow);
}

// Fork a template (R3 D8).
//
// A person picks a design and expects to land in the editor looking at it. That means the
// template's files are copied into the project's own working tree — a copy, never a
// reference, so editing a project can never change the template or another project made
// from it — and the state they arrived at is recorded as version #1. Without that first
// commit their history starts empty and there is nothing to restore back to.
//
// Without a sourceTemplateId this is still just an empty project row; the generation path
// fills one in and belongs to E4.
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
    // A sourceTemplateId that no longer exists is a bad request, not our failure: saying
    // `internal` would tell the caller to retry something that can never succeed.
    throw (
      clientFault(error, "That design is not available any more.") ??
      new ApiError("internal", "Could not create the project.", error.message)
    );
  }

  const projectId = data.id as string;
  if (!req.sourceTemplateId) return { id: projectId };

  try {
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("name, description, files, content_schema")
      .eq("id", req.sourceTemplateId)
      .maybeSingle();

    if (templateError) {
      throw new ApiError("internal", "Could not read the template.", templateError.message);
    }
    if (!template) throw new ApiError("not_found", "That design does not exist.");

    const files = (template.files ?? {}) as FileMap;
    await putProjectFiles(supabase, projectId, files);

    // The schema is copied for the same reason the files are (R3 D7). Read live through
    // source_template_id it was a reference, and a reference to a row that can be deleted
    // (`on delete set null`) or re-normalised under the project's feet — either of which
    // leaves someone holding a site they cannot edit.
    //
    // content_json is seeded from the markup at the same time, so the panel opens showing
    // the words that are on the page instead of a column of blanks. See content/from-files.
    const contentSchema = (template.content_schema ?? { sections: [] }) as ContentSchema;
    const { error: seedError } = await supabase
      .from("projects")
      .update({
        content_schema: contentSchema,
        content_json: contentFromFiles(files, contentSchema),
        // Enough for publish to emit a real <title> and description on day one (S-2). Both
        // are the owner's to change from the settings panel; what they must not be is
        // absent, because a site that publishes with no title is one nobody finds and the
        // person has no reason to suspect it. The name is what they typed a moment ago;
        // the description is the design's own, which at least describes the page they are
        // looking at.
        site_meta: {
          title: req.name,
          ...(template.description ? { description: template.description as string } : {}),
        },
      })
      .eq("id", projectId);

    if (seedError) {
      throw new ApiError("internal", "Could not set up the project's content.", seedError.message);
    }

    const { sha } = await createCommit(
      supabase,
      projectId,
      `Created from ${template.name}`,
      "system",
      files,
    );

    return { id: projectId, firstCommit: sha };
  } catch (err) {
    // A project with no files is not a draft, it is wreckage: it renders as nothing and the
    // person cannot tell why. Remove it so they see the error and can pick again, rather
    // than finding an empty site in their dashboard tomorrow.
    await supabase.from("projects").delete().eq("id", projectId);
    throw err;
  }
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
    throw (
      clientFault(error, "Some of those settings were not allowed.") ??
      new ApiError("internal", "Could not update the project.", error.message)
    );
  }
  if (!data) throw new ApiError("not_found", "That project does not exist.");

  return rowToDetail(data as unknown as ProjectRow);
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
