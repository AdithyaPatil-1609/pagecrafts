import type { DeploymentState } from "./deploy";

// A site the user owns. Both creation paths (template fork, AI generation) converge here.
// "draft" = no deployment yet; otherwise it mirrors the latest deployment's state.
export type ProjectStatus = "draft" | DeploymentState;

// Editable site-wide settings (S-3, S-4). Asset ids point at rows in `assets`.
export interface SiteMeta {
  title?: string;
  description?: string;
  faviconAssetId?: string;
  ogImageAssetId?: string;
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
  siteMeta: SiteMeta;
  formEndpoint: string | null; // null renders contact forms disabled (S-2)
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
