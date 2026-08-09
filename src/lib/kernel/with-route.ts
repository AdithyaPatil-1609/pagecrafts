import "server-only";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";

import { requireUser, supabaseRoute } from "@/lib/auth/session";
import { ApiError, fail } from "@/lib/errors/respond"
import { guardAiRequest } from "@/lib/limits/ai-guard";

export interface RouteContext<Body, Params> {
  req: NextRequest;
  params: Params;
  body: Body;
  userId: string; // "" when auth is "none"
  supabase: SupabaseClient; // scoped to the session, so RLS applies
}

export interface RouteOptions<Body, Params> {
  auth?: "required" | "none";
  schema?: ZodType<Body>;
  limit?: "ai";
  handler: (ctx: RouteContext<Body, Params>) => Promise<Response>;
}

export function withRoute<
  Body = undefined,
  Params extends Record<string, string | string[]> = Record<string, never>,
>(opts: RouteOptions<Body, Params>) {
  return async (
    req: NextRequest,
    segment?: { params: Promise<Params> },
  ): Promise<Response> => {
    try {
      const params = segment ? await segment.params : ({} as Params);

      let userId = "";
      let supabase: SupabaseClient;
      if (opts.auth === "none") {
        supabase = await supabaseRoute();
      } else {
        // Throws ApiError('unauthorized') when there is no session.
        const session = await requireUser();
        userId = session.userId;
        supabase = session.supabase;
      }

      let body = undefined as Body;
      if (opts.schema) {
        const json = await req.json().catch(() => null);
        const parsed = opts.schema.safeParse(json);
        if (!parsed.success) {
          return fail(
            "validation_failed",
            "Some fields were invalid.",
            parsed.error.message,
          );
        }
        body = parsed.data;
      }

      if (opts.limit !== "ai") {
        return await opts.handler({ req, params, body, userId, supabase });
      }

      const guard = await guardAiRequest(userId, req.headers);

      if (!guard.ok) return guard.response;

      try {
        return await opts.handler({ req, params, body, userId, supabase });
      } finally {
        await guard.release();
      }
    } catch (err) {
      if (err instanceof ApiError) return fail(err.code, err.message, err.detail);
      console.error("[api]", err);
      return fail("internal", "Something went wrong on our side.");
    }
  };
}
