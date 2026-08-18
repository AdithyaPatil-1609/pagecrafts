import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { deleteAccount, getAccount } from "@/lib/data/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/account — what we hold about the person asking.
export const GET = withRoute({
  auth: "required",
  handler: async ({ supabase }) => ok(await getAccount(supabase)),
});

// DELETE /api/v1/account — remove the account and everything it owns.
//
// No body, no confirmation token. The confirmation belongs in the interface, where a person
// can be shown what they are about to lose and made to type the words; a second field in
// the request would only be a checkbox the client ticks for them.
//
// A published site is not deleted. It is theirs, on hosting they were given, and closing an
// account is not the same request as taking a website off the internet (C-12).
export const DELETE = withRoute({
  auth: "required",
  handler: async ({ userId }) => {
    await deleteAccount(userId);
    return ok({ deleted: true as const });
  },
});
