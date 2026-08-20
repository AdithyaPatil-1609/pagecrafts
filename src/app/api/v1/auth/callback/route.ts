import "server-only";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { supabaseRouteClient } from "@/lib/auth/server";
import { safeNext } from "@/lib/auth/safe-next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const providerError = url.searchParams.get("error");
    const next = safeNext(url.searchParams.get("next"));

    if (providerError) {
        console.error("[auth/callback]", providerError, url.searchParams.get("error_description"));
        redirect("/signin?error=google_denied");
    }

    if (!code) {
        redirect("/signin?error=google_failed");
    }

    const supabase = await supabaseRouteClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error("[auth/callback]", error.code ?? error.status, error.message);
        redirect("/signin?error=google_failed");
    }

    redirect(next);
}
