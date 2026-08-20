import "server-only";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseRouteClient } from "@/lib/auth/server";
import { safeNext } from "@/lib/auth/safe-next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One route for every emailed link. Supabase sends either a PKCE `code` (the
// default template) or a `token_hash` plus `type` ("signup" for confirmation,
// "recovery" for a password reset). Both are traded for a real session cookie,
// then we send the user where they were going.
//
// `next` is not put on emailRedirectTo any more. A TokenHash template appends
// `?token_hash=...`, so a redirect that already carried `?next=/new` produced a
// URL with two question marks: everything after the first became one `next`
// value, `token_hash` never existed as its own parameter, and every confirmation
// link died at the `!tokenHash` check below with `?error=expired`.
//
// The default lives here instead, where no template can corrupt it. An explicit
// `next` is still honoured, so a link that wants somewhere else can say so.
const AFTER_CONFIRM = "/new";
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") as EmailOtpType | null;
    const requested = url.searchParams.get("next");
    const next = requested ? safeNext(requested) : AFTER_CONFIRM;

    const supabase = await supabaseRouteClient();

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error("[auth/confirm]", error.code ?? error.status, error.message);
            redirect("/signin?error=expired");
        }

        redirect(next);
    }

    if (!tokenHash || !type) {
        redirect("/signin?error=expired");
    }

    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (error) {
        redirect("/signin?error=expired");
    }

    redirect(next);
}
