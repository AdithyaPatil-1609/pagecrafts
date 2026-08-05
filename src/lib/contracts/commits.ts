// Version history. The commits table mirrors the Git layer for instant reads (E-6, V-1).
// A system auto-commit precedes every AI edit (V-2); restore is additive (never rewrites).
export type CommitAuthor = "user" | "ai_edit" | "system";

export interface Commit {
  sha: string;
  message: string;
  author: CommitAuthor;
  createdAt: string;
}

// GET /projects/{id}/commits
export interface ListCommitsResponse {
  items: Commit[];
}

// POST /projects/{id}/commits — explicit save.
export interface CreateCommitRequest {
  message: string;
}

export interface CreateCommitResponse {
  sha: string;
}

// POST /projects/{id}/restore — writes a NEW commit that rolls the tree back to {sha};
// older history stays intact (E-6, additive history).
export interface RestoreRequest {
  sha: string;
}

export interface RestoreResponse {
  newSha: string;
}
