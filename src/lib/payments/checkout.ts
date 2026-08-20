import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountPlan, BillingSummary, TemplateTier } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { supabaseAdmin } from "@/lib/data/supabase-admin";
import { checkEntitlement } from "@/lib/data/entitlements";
import {
    createOrder,
    paymentsConfigured,
    publishableKeyId,
    type OrderNotes,
} from "./razorpay";
import { inrToPaise, isFree, PREMIUM_PRICE_INR, PRO_PRICE_INR, publishPriceInr } from "./pricing";

// The gate at publish (R3 · Doc 22 P2/P3, Amendment A1).
//
// Opening a premium template or Pro look needs account Pro; signature templates and
// Premium looks need account Premium. That gate lives on createProject and generate/choose,
// not here. What this file still buys is a `publish` entitlement on one project. Two things
// decide it and both are read from the database rather than taken from the request: whether
// this project is the caller's, and what its design costs. A paywall the client is trusted
// to describe is not a paywall.

export interface CheckoutResponse {
    /** Nothing to pay — the entitlement is already granted and publish will go through. */
    granted: boolean;
    orderId?: string;
    amountInPaise?: number;
    currency?: "INR";
    keyId?: string;
    priceInr?: number;
}

interface ProjectForCheckout {
    tier: TemplateTier;
}

/**
 * What this project's design costs, read through the caller's own client.
 *
 * A project belonging to someone else is invisible to RLS, so it reads as absent — which is
 * both the security answer (SEC-14) and the honest one.
 */
async function priceOf(
    supabase: SupabaseClient,
    projectId: string,
): Promise<ProjectForCheckout> {
    const { data, error } = await supabase
        .from("projects")
        .select("source_template_id, templates(tier)")
        .eq("id", projectId)
        .maybeSingle();

    if (error) throw new ApiError("internal", "Could not read the project.", error.message);
    if (!data) throw new ApiError("not_found", "That project does not exist.");

    // A generated project has no design behind it and nothing to charge for yet; the same is
    // true if the design has since been removed. Free is the safe direction to fail: it can
    // be corrected without having taken anyone's money.
    const joined = data.templates as { tier?: TemplateTier } | { tier?: TemplateTier }[] | null;
    const row = Array.isArray(joined) ? joined[0] : joined;

    return { tier: row?.tier ?? "free" };
}

/**
 * Grant the publish entitlement. Server-side only, always.
 *
 * Written with the service role because the webhook has no session — Razorpay is not signed
 * in as anybody — and because `entitlements` is deliberately closed to clients. The unique
 * index on (project_id, kind) makes this idempotent: a webhook delivered twice, or a retry
 * after a timeout, grants once.
 */
export async function grantPublish(
    projectId: string,
    userId: string,
    source: "paid" | "launch_offer",
): Promise<void> {
    const admin = supabaseAdmin();

    const { error } = await admin.from("entitlements").insert({
        user_id: userId,
        project_id: projectId,
        kind: "publish",
        source,
        status: "active",
    });

    if (!error) return;

    // 23505 on the (project_id, kind) index: already unlocked. A webhook delivered twice, a
    // Razorpay retry, or a second checkout for a project that was already paid for all land
    // here, and all of them mean the same thing — the person can publish. Not an error.
    //
    // Insert rather than upsert deliberately: that index is partial (`where project_id is
    // not null`), and ON CONFLICT cannot always infer a partial index, so an upsert would
    // fail on the real database while passing against any fake.
    if (error.code === "23505") return;

    throw new ApiError("internal", "Could not unlock publishing.", error.message);
}

/**
 * Start paying to publish, or discover there is nothing to pay.
 *
 * A free design is granted on the spot: making somebody open a checkout for Rs 0 is a
 * worse experience and an extra way to fail. A paid one gets a Razorpay order, and the
 * entitlement waits for the webhook — never for the browser's word that it went through.
 */
export async function startPublishCheckout(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
): Promise<CheckoutResponse> {
    // Owner-scoped read first, before the entitlement is consulted (R3 D19 route audit).
    //
    // These two lines were the other way round, and the order mattered. checkEntitlement
    // asks about the *account*, not the project, and a `pro` subscription satisfies every
    // kind — so a subscriber asking about somebody else's project got `granted: true` and
    // returned before anything read the project row. Every other route on a project answers
    // not_found for one that is not yours; this one answered 200.
    //
    // Never exploitable: nothing was granted, nothing was charged, and the answer was
    // identical for an id belonging to nobody, so it leaked nothing either. It was the API
    // disagreeing with itself about what a stranger is told, which is exactly what an audit
    // is for and exactly what nobody finds by reading one route at a time.
    const { tier } = await priceOf(supabase, projectId);

    const existing = await checkEntitlement(supabase, userId, projectId, "publish");
    if (existing.granted) return { granted: true };

    if (isFree(tier)) {
        await grantPublish(projectId, userId, "launch_offer");
        return { granted: true };
    }

    const priceInr = publishPriceInr(tier);
    const amountInPaise = inrToPaise(priceInr);

    const notes: OrderNotes = { projectId, userId, kind: "publish" };
    const order = await createOrder(amountInPaise, `pub_${projectId.slice(0, 8)}_${Date.now()}`, notes);

    return {
        granted: false,
        orderId: order.id,
        amountInPaise: order.amount,
        currency: "INR",
        keyId: publishableKeyId(),
        priceInr,
    };
}

/**
 * Grant a per-user plan. Server-side only.
 *
 * One row per user per kind. A second payment, a webhook retry, or a return after they
 * switched to Starter all land here — insert once, and if that row already exists, turn it
 * back to active rather than inventing a second grant.
 */
async function grantAccountKind(userId: string, kind: "pro" | "premium"): Promise<void> {
    const admin = supabaseAdmin();
    const label = kind === "premium" ? "Premium" : "Pro";

    const existing = await admin
        .from("entitlements")
        .select("id, status")
        .eq("user_id", userId)
        .eq("kind", kind)
        .maybeSingle();

    if (existing.error) {
        throw new ApiError("internal", `Could not unlock ${label}.`, existing.error.message);
    }

    if (existing.data) {
        if (existing.data.status === "active") return;

        const { error } = await admin
            .from("entitlements")
            .update({
                status: "active",
                source: "paid",
                granted_at: new Date().toISOString(),
            })
            .eq("id", existing.data.id);

        if (error) throw new ApiError("internal", `Could not unlock ${label}.`, error.message);
        return;
    }

    const { error } = await admin.from("entitlements").insert({
        user_id: userId,
        project_id: null,
        kind,
        source: "paid",
        status: "active",
    });

    if (!error) return;
    if (error.code === "23505") return;

    throw new ApiError("internal", `Could not unlock ${label}.`, error.message);
}

export async function grantPro(userId: string): Promise<void> {
    await grantAccountKind(userId, "pro");
}

export async function grantPremium(userId: string): Promise<void> {
    await grantAccountKind(userId, "premium");
}

/** Stop paid plans on this account. Does not refund, and does not touch published sites. */
export async function revokePro(userId: string): Promise<void> {
    const admin = supabaseAdmin();

    const { error } = await admin
        .from("entitlements")
        .update({ status: "revoked" })
        .eq("user_id", userId)
        .in("kind", ["pro", "premium"])
        .eq("status", "active");

    if (error) throw new ApiError("internal", "Could not switch to Starter.", error.message);
}

function isLivePlanRow(row: { status: string; expires_at?: string | null }, now: number): boolean {
    if (row.status !== "active") return false;
    if (!row.expires_at) return true;
    const expiry = Date.parse(row.expires_at);
    return Number.isFinite(expiry) && expiry > now;
}

function currentPlanFromRows(
    rows: { kind: string; status: string; expires_at?: string | null }[],
): AccountPlan {
    const now = Date.now();
    const live = rows.filter((row) => isLivePlanRow(row, now));
    if (live.some((row) => row.kind === "premium")) return "premium";
    if (live.some((row) => row.kind === "pro")) return "pro";
    return "starter";
}

/**
 * Start paying for Pro or Premium, or discover they already hold it (or a higher plan).
 */
export async function startPlanCheckout(
    supabase: SupabaseClient,
    userId: string,
    plan: "pro" | "premium",
): Promise<CheckoutResponse> {
    const billing = await getBilling(supabase, userId);
    if (plan === "pro" && (billing.plan === "pro" || billing.plan === "premium")) {
        return { granted: true };
    }
    if (plan === "premium" && billing.plan === "premium") return { granted: true };

    const priceInr = plan === "premium" ? PREMIUM_PRICE_INR : PRO_PRICE_INR;
    const notes: OrderNotes = { userId, kind: plan };
    const order = await createOrder(
        inrToPaise(priceInr),
        `${plan}_${userId.slice(0, 8)}_${Date.now()}`,
        notes,
    );

    return {
        granted: false,
        orderId: order.id,
        amountInPaise: order.amount,
        currency: "INR",
        keyId: publishableKeyId(),
        priceInr,
    };
}

export async function startProCheckout(
    supabase: SupabaseClient,
    userId: string,
): Promise<CheckoutResponse> {
    return startPlanCheckout(supabase, userId, "pro");
}

/** What Settings and /plans show: the live plan, whether checkout can open, and every grant. */
export async function getBilling(
    supabase: SupabaseClient,
    userId: string,
): Promise<BillingSummary> {
    const { data, error } = await supabase
        .from("entitlements")
        .select("id, kind, source, status, granted_at, expires_at, project_id")
        .eq("user_id", userId)
        .order("granted_at", { ascending: false });

    if (error) throw new ApiError("internal", "Could not read billing.", error.message);

    const rows = data ?? [];

    return {
        plan: currentPlanFromRows(rows as { kind: string; status: string; expires_at?: string | null }[]),
        paymentsReady: paymentsConfigured(),
        proPriceInr: PRO_PRICE_INR,
        premiumPriceInr: PREMIUM_PRICE_INR,
        history: rows.map((row) => {
            const item = row as {
                id: string;
                kind: BillingSummary["history"][number]["kind"];
                source: BillingSummary["history"][number]["source"];
                status: BillingSummary["history"][number]["status"];
                granted_at: string;
                project_id: string | null;
            };
            return {
                id: String(item.id),
                kind: item.kind,
                source: item.source,
                status: item.status,
                grantedAt: String(item.granted_at),
                projectId: item.project_id ?? null,
            };
        }),
    };
}
