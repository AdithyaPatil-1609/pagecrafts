import type { ContentSchema } from "./content-schema";
import type { DeploymentState } from "./deploy";

// A site the user owns. Both creation paths (template fork, AI generation) converge here.
// "draft" = no deployment yet; otherwise it mirrors the latest deployment's state.
export type ProjectStatus = "draft" | DeploymentState;

// Editable site-wide settings (S-3, S-4). Asset ids point at rows in `assets`; the URLs
// beside them are what actually goes into the published `<head>`, because a static site on
// someone else's hosting has no way to resolve an id at serve time. Both are kept: the id is
// the provenance record, the URL is the reference.
export interface SiteMeta {
  title?: string;
  description?: string;
  faviconAssetId?: string;
  faviconUrl?: string;
  ogImageAssetId?: string;
  ogImageUrl?: string;
}

// Dashboard row (GET /projects). Carries the latest deployment status so a failed
// publish is visible without opening the project (V-7).
export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  liveUrl: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
}

// Full project (GET /projects/{id}).
export interface ProjectDetail extends ProjectSummary {
  sourceTemplateId: string | null; // null for generated projects
  contentJson: Record<string, unknown>;
  // The project's own copy, taken at fork (R3 D7). The content panel is generated from
  // this and nothing else (C-07), so it has to travel with the project rather than being
  // fetched from the template — which for a retired design no longer exists.
  contentSchema: ContentSchema;
  siteMeta: SiteMeta;
  formEndpoint: string | null; // null renders contact forms disabled (S-2)
  // The template's content_schema, travelling with the project so the editor draws its
  // panel from one fetch (C-07). Null for a project with no template — a generated site
  // before its schema is written, or one whose design has been retired.
  contentSchema: ContentSchema | null;
}

// POST /projects — fork a template (synchronous) or start a generation (async).
export interface CreateProjectRequest {
  name: string;
  sourceTemplateId?: string; // fork path
  mode?: "generate"; // generation path
  prompt?: string; // generation path
}

export interface CreateProjectResponse {
  id: string;
  firstCommit?: string; // fork returns the initial commit sha
  jobId?: string; // generate returns a job to poll
}

// PATCH /projects/{id} — rename + site settings (S-2, S-3, S-4).
export interface PatchProjectRequest {
  name?: string;
  siteMeta?: SiteMeta;
  formEndpoint?: string | null;
}
