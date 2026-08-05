import "server-only";
import { currentUser } from "@/lib/auth/session";
import { ok, fail, unexpected } from "@/lib/errors/api-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return fail("unauthorized", "Sign in to continue.");
    }

    return ok({ user });
  } catch (error) {
    return unexpected(error);
  }
}
