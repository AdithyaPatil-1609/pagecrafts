import "server-only";
import type { NextRequest } from "next/server";
import { supabaseRouteClient } from "@/lib/auth/server";
import { passwordResetRequestSchema } from "@/lib/contracts/auth";
import { publicEnv } from "@/lib/config/env";
import { ok, fail, guard } from "@/lib/errors/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    return guard(async () => {
        const json = await request.json().catch(() => null);
        const parsed = passwordResetRequestSchema.safeParse(json);

        if (!parsed.success) {
            return fail("validation_failed", "Enter a valid email address.");
        }

        const supabase = await supabaseRouteClient();
        await supabase.auth.resetPasswordForEmail(parsed.data.email, {
            redirectTo: `${publicEnv.appUrl}/api/v1/auth/confirm?next=/reset`,
        });

        // SEC-05: the same answer whether or not this address has an account.
        // Never let a caller learn who is registered by watching the response.
        return ok({ status: "accepted" as const }, 202);
    });
}
