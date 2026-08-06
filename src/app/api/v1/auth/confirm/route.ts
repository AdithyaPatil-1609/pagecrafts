import "server-only";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseRouteClient } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One route for every emailed link. Supabase sends `token_hash` and a `type`
// ("signup" for confirmation, "recovery" for a password reset); verifyOtp trades
// that token for a real session cookie, then we send the user where they were going.
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") as EmailOtpType | null;
    const next = url.searchParams.get("next") ?? "/new";

    if (!tokenHash || !type) {
        redirect("/?error=expired");
    }

    const supabase = await supabaseRouteClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (error) {
        redirect("/?error=expired");
    }

    redirect(next);
}