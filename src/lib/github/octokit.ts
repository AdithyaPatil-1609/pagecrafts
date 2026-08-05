import "server-only";
import { Octokit } from "octokit";

export class MissingGitHubTokenError extends Error {
  constructor() {
    super("No GitHub token available for this request");
    this.name = "MissingGitHubTokenError";
  }
}

/**
 * Builds an authenticated Octokit client.
 * The caller supplies the token — this module never reads it from
 * storage, so the decryption path can land later without changing this.
 */
export function createOctokit(token: string): Octokit {
  if (!token || token.trim() === "") {
    throw new MissingGitHubTokenError();
  }
  return new Octokit({ auth: token });
}

export type GitHubIdentity = {
  login: string;
  id: number | bigint;
  scopes: string[];
};

export async function whoami(client: Octokit): Promise<GitHubIdentity> {
  const res = await client.request("GET /user");

  const scopeHeader = res.headers["x-oauth-scopes"] ?? "";
  const scopes = String(scopeHeader)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return { login: res.data.login, id: res.data.id, scopes };
}