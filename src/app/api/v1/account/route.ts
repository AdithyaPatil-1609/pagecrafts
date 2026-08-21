import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { withRoute } from "@/lib/kernel/with-route";
import { ok, ApiError } from "@/lib/errors/respond";
import { deleteAccount, getAccount } from "@/lib/data/account";
import { authenticateWithPassword } from "@/lib/auth/password-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/account — what we hold about the person asking.
export const GET = withRoute({
  auth: "required",
  handler: async ({ supabase }) => ok(await getAccount(supabase)),
});

const deleteSchema = z.object({
  password: z.string().min(1).max(200).optional(),
});

// An account that can be closed by anyone who finds an unlocked laptop is not protected by
// a sentence typed into a box: the typing is a guard against accident, not against a person.
// So the password is asked for again here, and checked against Supabase rather than against
// anything the client sends alongside it.
//
// Only accounts that have a password are asked for one. Signing in with Google never sets
// one, and demanding a password those people do not have would leave them unable to close
// their own account.
async function hasPassword(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.auth.getUser();

  return (data.user?.identities ?? []).some((identity) => identity.provider === "email");
}

// DELETE /api/v1/account — remove the account and everything it owns.
//
// A published site is not deleted. It is theirs, on hosting they were given, and closing an
// account is not the same request as taking a website off the internet (C-12).
export const DELETE = withRoute<z.infer<typeof deleteSchema>>({
  auth: "required",
  schema: deleteSchema,
  handler: async ({ userId, email, body, req, supabase }) => {
    if (await hasPassword(supabase)) {
      const password = body?.password ?? "";

      if (!password) {
        throw new ApiError("unauthorized", "Enter your password to close your account.");
      }

      const attempt = await authenticateWithPassword({
        headers: req.headers,
        supabase,
        email,
        password,
      });

      if (!attempt.ok) {
        throw new ApiError("unauthorized", "That password is not right.");
      }
    }

    await deleteAccount(userId);
    return ok({ deleted: true as const });
  },
});
