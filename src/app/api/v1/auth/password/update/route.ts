import "server-only";
import type { NextRequest } from "next/server";
import { supabaseRouteClient } from "@/lib/auth/server";
import { passwordUpdateSchema } from "@/lib/contracts/auth";
import { toSessionUser } from "@/lib/auth/session";
import { ok, fail, guard } from "@/lib/errors/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    return guard(async () => {
        const json = await request.json().catch(() => null);
        const parsed = passwordUpdateSchema.safeParse(json);

        if (!parsed.success) {
            return fail("validation_failed", "Choose a password of at least 10 characters.");
        }

        const supabase = await supabaseRouteClient();

        // The recovery link established a session. No session means the link expired,
        // was already used, or somebody is calling this route directly.
        const { data: sessionData } = await supabase.auth.getUser();
        if (!sessionData.user) {
            return fail("unauthorized", "That reset link has expired. Ask for a new one.");
        }

        const { data, error } = await supabase.auth.updateUser({
            password: parsed.data.password,
        });
        if (error || !data.user) {
            return fail("validation_failed", "That password was not accepted. Try a different one.");
        }

        return ok({ user: toSessionUser(data.user) });
    });
}
