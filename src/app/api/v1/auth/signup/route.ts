import "server-only";
import type { NextRequest } from "next/server";
import { supabaseRouteClient } from "@/lib/auth/server";
import { readCredentials } from "@/lib/auth/credentials";
import { toSessionUser } from "@/lib/auth/session";
import { ok, fail, guard } from "@/lib/errors/respond";
import { publicEnv } from "@/lib/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      return fail("validation_failed", credentials.message);
    }

    const supabase = await supabaseRouteClient();
    const { data, error } = await supabase.auth.signUp({
      email: credentials.value.email,
      password: credentials.value.password,
      options: {
        emailRedirectTo: `${publicEnv.appUrl}/api/v1/auth/confirm?next=/new`,
      },
    });

    if (error) {
      if (error.status === 429) {
        return fail("rate_limited", "Too many attempts. Try again shortly.");
      }
      if (error.code === "weak_password") {
        return fail("validation_failed", "Choose a stronger password.");
      }
      if (error.code === "email_address_invalid") {
        return fail("validation_failed", "Enter a valid email address.");
      }
      if (error.code === "signup_disabled") {
        return fail("forbidden", "New accounts are not being accepted right now.");
      }
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        return ok({ user: null, pending: true }, 202);
      }
      console.error("[auth/signup]", error.code ?? error.status, error.message);
      return fail("internal", "We could not create your account. Try again.");
    }

    if (!data.user || !data.session) {
      return ok({ user: null, pending: true }, 202);
    }

    return ok({ user: toSessionUser(data.user), pending: false }, 201);
  });
}
