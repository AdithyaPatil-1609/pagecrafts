import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeploymentResponse, DeploymentState } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { clientFault } from "./pg-errors";

// The deployment row behind the dashboard (R3 D12, V-7, N-4).
//
// Nothing wrote one of these before today. The dashboard has read them since D2 —
// statusOf() and liveUrlOf() in data/projects.ts — so every project has shown "draft"
// however many times it was published, and a failed publish was invisible until somebody
// opened the project and tried again.
//
// One row per attempt, updated as it goes, because that is what the dashboard's own code is
// written around ("Newest attempt wins. One row per publish attempt"). A row per state
// change would make that comment false and turn one publish into six lines of history.

export interface DeploymentRecord {
    id: string;
    state: DeploymentState;
}

/**
 * Begin recording an attempt.
 *
 * Written before anything is provisioned, so the dashboard says "publishing" while it
 * happens rather than staying blank until it is over. A publish that dies without ever
 * reporting back therefore leaves a `pending` row — which is honest: something was started
 * and nobody knows how it ended. A missing row would claim nothing was tried at all.
 */
export async function startDeployment(
    supabase: SupabaseClient,
    projectId: string,
    commitSha?: string | null,
): Promise<DeploymentRecord> {
    const { data, error } = await supabase
        .from("deployments")
        .insert({
            project_id: projectId,
            status: "pending" satisfies DeploymentState,
            ...(commitSha ? { commit_sha: commitSha } : {}),
        })
        .select("id")
        .single();

    if (error) {
        throw (
            clientFault(error, "That project cannot be published.") ??
            new ApiError("internal", "Could not start the deployment.", error.message)
        );
    }

    return { id: data.id as string, state: "pending" };
}

/**
 * One attempt, as the client polling it sees it (GET /deployments/{id}, R3 D15).
 *
 * The four in-flight states collapse to `pending`. The contract's status enum is
 * pending | live | failed and was frozen on day one; the extra states exist so the
 * dashboard can narrate progress from the row it already reads, not so this endpoint can
 * invent values integrators were never told about. "Not finished yet" is the honest and
 * complete answer to a poll.
 */
export async function getDeployment(
    supabase: SupabaseClient,
    deploymentId: string,
): Promise<DeploymentResponse> {
    const { data, error } = await supabase
        .from("deployments")
        .select("status, repo_url, live_url, commit_sha, error")
        .eq("id", deploymentId)
        .maybeSingle();

    if (error) {
        throw new ApiError("internal", "Could not read the deployment.", error.message);
    }
    // Someone else's deployment is invisible through RLS, and must read as absent rather
    // than forbidden (SEC-14).
    if (!data) throw new ApiError("not_found", "That deployment does not exist.");

    const state = data.status as DeploymentState;

    return {
        status: state === "live" || state === "failed" ? state : "pending",
        repoUrl: (data.repo_url as string | null) ?? null,
        liveUrl: (data.live_url as string | null) ?? null,
        commitSha: (data.commit_sha as string | null) ?? null,
        error: (data.error as string | null) ?? null,
    };
}

export interface DeploymentPatch {
    liveUrl?: string | null;
    commitSha?: string | null;
    error?: string | null;
}

/**
 * Move an attempt to its next state.
 *
 * `live` is refused without a URL before the write is attempted. The database has the same
 * CHECK, so this changes nothing about what can be stored — it changes what the caller is
 * told. A constraint violation arrives as an opaque Postgres string; this says which rule
 * was broken and about which deployment, at the point the mistake was made.
 */
export async function advanceDeployment(
    supabase: SupabaseClient,
    deploymentId: string,
    state: DeploymentState,
    patch: DeploymentPatch = {},
): Promise<void> {
    if (state === "live" && !patch.liveUrl) {
        throw new ApiError(
            "internal",
            "A deployment cannot be marked live without a verified URL.",
            `deployment=${deploymentId}`,
        );
    }

    const { error } = await supabase
        .from("deployments")
        .update({
            status: state,
            // Written explicitly rather than left to a trigger: there is no trigger on this
            // table, and supabase-js drops undefined at serialisation — so an update that
            // set nothing else would reach PostgREST as an empty statement and fail (the
            // lesson from the R3 D5 sweep).
            updated_at: new Date().toISOString(),
            ...(patch.liveUrl !== undefined ? { live_url: patch.liveUrl } : {}),
            ...(patch.commitSha !== undefined ? { commit_sha: patch.commitSha } : {}),
            ...(patch.error !== undefined ? { error: patch.error } : {}),
        })
        .eq("id", deploymentId);

    if (error) {
        throw (
            clientFault(error, "That deployment state was not allowed.") ??
            new ApiError("internal", "Could not update the deployment.", error.message)
        );
    }
}

/**
 * A recorder for one publish attempt.
 *
 * publish() already takes an `onState` callback and reports every step through it; this
 * turns that into rows without the publish flow knowing a database exists. The route wires
 * the two together and needs no knowledge of the states themselves.
 *
 * `onState` deliberately swallows its own failures. Losing the dashboard's progress line is
 * a cosmetic fault; letting it throw would abort a publish that is otherwise going fine —
 * and a site half-deployed because its status row could not be written is a much worse
 * outcome than a stale status row.
 */
export async function recordDeployment(
    supabase: SupabaseClient,
    projectId: string,
): Promise<{
    /** The row's id — the publish route hands this back for the client to poll (R3 D15). */
    id: string;
    onState: (state: DeploymentState) => void;
    finish: (result: { state: DeploymentState; liveUrl?: string | null; commitSha?: string | null; error?: string | null }) => Promise<void>;
}> {
    const started = await startDeployment(supabase, projectId);

    return {
        id: started.id,
        onState: (state) => {
            // Intermediate states only. The final one carries a URL or an error with it and
            // is written by finish(), which the caller awaits.
            if (state === "live" || state === "failed") return;
            void advanceDeployment(supabase, started.id, state).catch(() => undefined);
        },
        finish: (result) =>
            advanceDeployment(supabase, started.id, result.state, {
                liveUrl: result.liveUrl ?? null,
                commitSha: result.commitSha ?? null,
                error: result.error ?? null,
            }),
    };
}
