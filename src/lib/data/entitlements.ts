import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntitlementCheck, EntitlementKind, EntitlementSource } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";

// The server-side entitlement check (R3 D9, A-5, Doc 22 §6).
//
// The table has existed since D5 and nothing read it until the fork gate at D8. This is the
// rest: the question publish asks before it puts a site live, and the same question the
// post-publish edit path asks before it reopens editing.
//
// Two properties matter more than the mechanics.
//
// It is read here, from the database, and never taken from the request. A client that can
// say "I am entitled" is a client that can publish for free, and no amount of UI politeness
// changes that.
//
// It is a read, not a charge. Asking twice grants twice and costs nothing, which is what
// makes a retried publish safe: the second attempt finds the grant the first one was made
// under, rather than reaching for a payment that has already been taken.

interface EntitlementRow {
    kind: EntitlementKind;
    source: EntitlementSource;
    status: string;
    expires_at: string | null;
}

/**
 * Whether a row is a grant *now*.
 *
 * status and expires_at are separate columns and they can disagree: a subscription that
 * lapsed at midnight still reads 'active' until something sweeps it, and nothing sweeps it
 * today. Trusting status alone would keep a lapsed account publishing indefinitely, so the
 * date is part of the question rather than a tidy-up job somebody has to remember to run.
 */
function isLive(row: EntitlementRow, now: Date): boolean {
    if (row.status !== "active") return false;
    if (!row.expires_at) return true;

    const expiry = Date.parse(row.expires_at);
    return Number.isNaN(expiry) ? false : expiry > now.getTime();
}

async function liveEntitlements(
    supabase: SupabaseClient,
    userId: string,
    projectId: string | null,
): Promise<EntitlementRow[]> {
    // Per-user rows (pro) carry no project, so both are fetched in one go and sorted out
    // here — one round trip rather than one per kind.
    const { data, error } = await supabase
        .from("entitlements")
        .select("kind, source, status, expires_at, project_id")
        .eq("user_id", userId);
    if (error) throw new ApiError("internal", "Could not check your account.", error.message);

    const now = new Date();
    return (data ?? [])
        .filter((row) => {
            const r = row as unknown as EntitlementRow & { project_id: string | null };
            if (!isLive(r, now)) return false;
            // A project-scoped grant only counts for its own project; `pro` counts always.
            return r.kind === "pro" || r.project_id === projectId;
        })
        .map((row) => row as unknown as EntitlementRow);
}

/**
 * Does this account hold `kind` for this project?
 *
 * `pro` satisfies everything: a subscription that did not cover publishing would be a
 * subscription nobody could describe. It is reported as granted with source `pro`, so a
 * caller can still tell a subscription apart from a one-off purchase.
 */
export async function checkEntitlement(
    supabase: SupabaseClient,
    userId: string,
    projectId: string | null,
    kind: EntitlementKind,
): Promise<EntitlementCheck> {
    const rows = await liveEntitlements(supabase, userId, projectId);

    const exact = rows.find((row) => row.kind === kind);
    if (exact) {
        return { kind, granted: true, source: exact.source, expiresAt: exact.expires_at };
    }

    const pro = rows.find((row) => row.kind === "pro");
    if (pro) return { kind, granted: true, source: "pro", expiresAt: pro.expires_at };

    return { kind, granted: false };
}

/** True when the account holds a live `pro` subscription. */
export async function hasPro(supabase: SupabaseClient, userId: string): Promise<boolean> {
    return (await checkEntitlement(supabase, userId, null, "pro")).granted;
}

/**
 * The gate publish calls. Throws rather than returning false, so a caller cannot forget to
 * look at the answer — the failure mode of a boolean gate is publishing anyway.
 */
export async function assertCanPublish(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
): Promise<EntitlementCheck> {
    const check = await checkEntitlement(supabase, userId, projectId, "publish");

    if (!check.granted) {
        throw new ApiError(
            "payment_required",
            "This site needs to be paid for before it can go live.",
            `projectId=${projectId}`,
        );
    }

    return check;
}
