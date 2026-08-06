import "server-only";
import { currentUser } from "@/lib/auth/session";
import { ok, fail, guard } from "@/lib/errors/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return guard(async () => {
    const user = await currentUser();

    if (!user) {
      return fail("unauthorized", "Sign in to continue.");
    }

    return ok({ user });
  });
}
