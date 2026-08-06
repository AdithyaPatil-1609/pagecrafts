import "server-only";
import type { NextRequest } from "next/server";
import { supabaseRouteClient } from "@/lib/auth/server";
import { readCredentials } from "@/lib/auth/credentials";
import { toSessionUser } from "@/lib/auth/session";
import { ok, fail, guard } from "@/lib/errors/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_FAILURE = "That email and password combination is not correct.";

export async function POST(request: NextRequest) {
  return guard(async () => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return fail("validation_failed", "Send a JSON body with email and password.");
    }

    const credentials = readCredentials(body);

    if (!credentials.ok) {
      return fail("unauthorized", GENERIC_FAILURE);
    }

    const supabase = await supabaseRouteClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.value.email,
      password: credentials.value.password,
    });

    if (error) {
      if (error.status === 429) {
        return fail("rate_limited", "Too many attempts. Try again shortly.");
      }
      if (error.code === "email_not_confirmed") {
        return fail(
          "forbidden",
          "Confirm your email address to finish setting up your account.",
        );
      }
      return fail("unauthorized", GENERIC_FAILURE);
    }

    if (!data.user) {
      return fail("unauthorized", GENERIC_FAILURE);
    }

    return ok({ user: toSessionUser(data.user) });
  });
}
