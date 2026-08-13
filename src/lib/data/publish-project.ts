import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublishProjectResponse } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { assertCanPublish } from "./entitlements";
import { recordDeployment } from "./deployments";
import { projectPublishInputs } from "@/lib/deploy/publishable";
import { publish } from "@/lib/deploy/publish";
import { PublishError } from "@/lib/deploy/errors";

// Publishing a project (R3 D15 · FR-080–FR-091, C-05).
//
// Everything this needs already existed and nothing called it: entitlements decide whether
// a site may go live, publishable.ts turns a working tree into a build, deployments.ts
// records the attempt, and publish() runs the provider steps. This is the seam between
// them, and the shape of it is dictated by one fact — a publish can legitimately take
// ninety seconds, and no request should be held open that long.
//
// So the request does the parts that can fail fast and answer honestly (is this project
// yours, is it paid for, does it have files), writes the deployment row, and hands back its
// id. The provider work runs on after the response, reporting into that row, and the client
// polls GET /deployments/{id} — which is what NFR-117 asks for and what the contract's
// `status: "pending"` has always implied.

/** Where the site lives on the host, kept so a republish updates rather than duplicating. */
async function siteIdFor(supabase: SupabaseClient, projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("repo_full_name")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new ApiError("internal", "Could not read the project.", error.message);
  // RLS: someone else's project is not there, and must not be distinguishable from one that
  // never existed (SEC-14).
  if (!data) throw new ApiError("not_found", "That project does not exist.");

  return (data.repo_full_name as string | null) ?? null;
}

/** FR-087: ten republishes produce one site, not ten. */
async function rememberSite(
  supabase: SupabaseClient,
  projectId: string,
  siteId: string,
): Promise<void> {
  await supabase.from("projects").update({ repo_full_name: siteId }).eq("id", projectId);
}

export async function publishProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  idempotencyKey: string,
): Promise<PublishProjectResponse> {
  // Before anything is recorded or provisioned. A publish nobody paid for should cost us
  // nothing and leave no trace, and the caller should hear payment_required rather than
  // watch a deployment fail for reasons it cannot act on.
  await assertCanPublish(supabase, userId, projectId);

  const siteId = await siteIdFor(supabase, projectId);
  const { projectName, files } = await projectPublishInputs(supabase, projectId);

  if (files.length === 0) {
    throw new ApiError("validation_failed", "There is nothing to publish yet.", projectId);
  }

  const attempt = await recordDeployment(supabase, projectId);

  // Deliberately not awaited. The response carries the deployment id and the client polls;
  // holding the request open for the ninety seconds this can take would time out the
  // function and tell the user nothing. Every outcome is written to the row, including the
  // failures — an attempt that dies silently leaves `pending`, which is the honest answer
  // when nobody knows how it ended.
  void publish({ projectId, projectName, files, siteId, idempotencyKey }, attempt.onState)
    .then(async (result) => {
      if (!siteId) await rememberSite(supabase, projectId, result.siteId);

      await attempt.finish({
        state: result.state,
        liveUrl: result.liveUrl,
        commitSha: result.commitSha,
        error: result.error,
      });
    })
    .catch(async (error: unknown) => {
      const failure =
        error instanceof PublishError
          ? `${error.message}${error.detail ? ` (${error.detail})` : ""}`
          : error instanceof Error
            ? error.message
            : String(error);

      // finish() can itself fail — a dropped connection, a policy change. There is nothing
      // useful left to do at that point except not crash the process the response already
      // left behind.
      await attempt.finish({ state: "failed", error: failure }).catch(() => undefined);
    });

  return { deploymentId: attempt.id, status: "pending" };
}
