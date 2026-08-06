import "server-only";
import { supabaseRouteClient } from "@/lib/auth/server";
import { ok, guard } from "@/lib/errors/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return guard(async () => {
    const supabase = await supabaseRouteClient();
    await supabase.auth.signOut();

    return ok({ signedOut: true });
  });
}
