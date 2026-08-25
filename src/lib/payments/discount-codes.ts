import "server-only";

import { ApiError } from "@/lib/errors/respond";
import { supabaseAdmin } from "@/lib/data/supabase-admin";
import type { OrderKind } from "./razorpay";
import {
    applyPercentOff,
    codeAppliesTo,
    normalizeScratchCode,
    type DiscountAppliesTo,
} from "./discount-math";

interface DiscountCodeRow {
    id: string;
    code: string;
    percent_off: number;
    applies_to: DiscountAppliesTo;
    max_redemptions: number;
    redeemed_count: number;
    reserved_by: string | null;
    reserved_order_id: string | null;
    reserved_at: string | null;
    expires_at: string | null;
    disabled_at: string | null;
}

export interface PricedWithCode {
    priceInr: number;
    listPriceInr: number;
    discountPercent?: number;
    discountCode?: string;
}

function invalidCode(): never {
    throw new ApiError(
        "invalid_discount",
        "That scratch-card code is not valid, has expired, or has already been used.",
    );
}

function pricedFrom(row: DiscountCodeRow, listPriceInr: number): PricedWithCode {
    return {
        priceInr: applyPercentOff(listPriceInr, row.percent_off),
        listPriceInr,
        discountPercent: row.percent_off,
        discountCode: row.code,
    };
}

export async function previewDiscount(
    userId: string,
    kind: OrderKind,
    listPriceInr: number,
    rawCode: string,
): Promise<PricedWithCode> {
    const code = normalizeScratchCode(rawCode);
    if (!code) invalidCode();

    const { data, error } = await supabaseAdmin()
        .from("discount_codes")
        .select(
            "id, code, percent_off, applies_to, max_redemptions, redeemed_count, reserved_by, reserved_at, expires_at, disabled_at",
        )
        .eq("code", code)
        .maybeSingle();

    if (error) throw new ApiError("internal", "Could not read that code.", error.message);
    if (!data) invalidCode();

    const row = data as DiscountCodeRow;
    const now = Date.now();
    if (row.disabled_at) invalidCode();
    if (row.expires_at && Date.parse(row.expires_at) <= now) invalidCode();
    if (row.redeemed_count >= row.max_redemptions) invalidCode();
    if (
        row.reserved_by &&
        row.reserved_at &&
        now - Date.parse(row.reserved_at) < 30 * 60 * 1000 &&
        row.reserved_by !== userId
    ) {
        invalidCode();
    }
    if (!codeAppliesTo(row.applies_to, kind)) invalidCode();

    return pricedFrom(row, listPriceInr);
}

/**
 * Hold the card for this checkout so a second person cannot start paying with the same code.
 * Released if Razorpay order creation fails; captured when payment (or a 100% grant) lands.
 */
export async function reserveDiscount(
    userId: string,
    kind: OrderKind,
    listPriceInr: number,
    rawCode: string,
): Promise<PricedWithCode> {
    const code = normalizeScratchCode(rawCode);
    if (!code) invalidCode();

    const { data, error } = await supabaseAdmin().rpc("reserve_discount_code", {
        p_code: code,
        p_user_id: userId,
    });

    if (error) throw new ApiError("internal", "Could not hold that code.", error.message);
    if (!data) invalidCode();

    const row = data as DiscountCodeRow;
    if (!codeAppliesTo(row.applies_to, kind)) {
        await releaseDiscountReservation(code, userId);
        invalidCode();
    }

    return pricedFrom(row, listPriceInr);
}

export async function attachReservedOrder(code: string, orderId: string): Promise<void> {
    const { error } = await supabaseAdmin()
        .from("discount_codes")
        .update({ reserved_order_id: orderId })
        .eq("code", code);

    if (error) throw new ApiError("internal", "Could not attach that payment to the code.", error.message);
}

export async function releaseDiscountReservation(code: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin()
        .from("discount_codes")
        .update({
            reserved_by: null,
            reserved_at: null,
            reserved_order_id: null,
        })
        .eq("code", code)
        .eq("reserved_by", userId);

    if (error) {
        console.error("[payments] could not release scratch-card reservation", {
            code,
            reason: error.message,
        });
    }
}

export async function captureDiscount(opts: {
    code: string;
    userId: string;
    kind: OrderKind;
    orderId?: string;
    listPriceInr: number;
    paidInr: number;
}): Promise<void> {
    const code = normalizeScratchCode(opts.code);
    if (!code) return;

    const { data, error } = await supabaseAdmin().rpc("capture_discount_code", {
        p_code: code,
        p_user_id: opts.userId,
        p_order_id: opts.orderId ?? null,
        p_kind: opts.kind,
        p_list_price_inr: opts.listPriceInr,
        p_paid_inr: opts.paidInr,
    });

    if (error) {
        console.error("[payments] could not capture scratch-card", {
            code,
            orderId: opts.orderId,
            reason: error.message,
        });
        return;
    }

    if (!data) {
        console.info("[payments] scratch-card already captured", { code, orderId: opts.orderId });
    }
}
