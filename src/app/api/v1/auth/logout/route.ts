import "server-only";
import { supabaseRouteClient } from "@/lib/auth/server";
import { ok, unexpected } from "@/lib/errors/api-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await supabaseRouteClient();
    await supabase.auth.signOut();

    return ok({ signedOut: true });
  } catch (error) {
    return unexpected(error);
  }
}
