import "server-only";
import type { NextRequest } from "next/server";
import { supabaseRouteClient } from "@/lib/auth/server";
import { readCredentials } from "@/lib/auth/credentials";
import { toSessionUser } from "@/lib/auth/session";
import { ok, fail, unexpected } from "@/lib/errors/api-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return fail("validation_failed", "Send a JSON body with email and password.");
  }

  const credentials = readCredentials(body);

  if (!credentials.ok) {
    return fail("validation_failed", credentials.message);
  }

  try {
    const supabase = await supabaseRouteClient();
    const { data, error } = await supabase.auth.signUp({
      email: credentials.value.email,
      password: credentials.value.password,
    });

    if (error) {
      if (error.status === 429) {
        return fail("rate_limited", "Too many attempts. Try again shortly.");
      }
      if (error.code === "weak_password") {
        return fail("validation_failed", "Choose a stronger password.");
      }
      return ok({ user: null, pending: true }, 202);
    }

    if (!data.user || !data.session) {
      return ok({ user: null, pending: true }, 202);
    }

    return ok({ user: toSessionUser(data.user), pending: false }, 201);
  } catch (error) {
    return unexpected(error);
  }
}
