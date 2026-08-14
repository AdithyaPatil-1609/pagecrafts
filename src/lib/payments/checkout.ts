import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TemplateTier } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { supabaseAdmin } from "@/lib/data/supabase-admin";
import { checkEntitlement } from "@/lib/data/entitlements";
import { createOrder, publishableKeyId, type OrderNotes } from "./razorpay";
import { inrToPaise, isFree, publishPriceInr } from "./pricing";

// The gate at publish (R3 · Doc 22 P2/P3, Amendment A1).
//
// Everything before publish is free. The price appears once, here, stated plainly, and what
// it buys is a `publish` entitlement on one project. Two things decide it and both are read
// from the database rather than taken from the request: whether this project is the
// caller's, and what its design costs. A paywall the client is trusted to describe is not a
// paywall.

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
    const existing = await checkEntitlement(supabase, userId, projectId, "publish");
    if (existing.granted) return { granted: true };

    const { tier } = await priceOf(supabase, projectId);

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
