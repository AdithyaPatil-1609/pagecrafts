import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { billingProfileSchema } from "@/lib/contracts/schemas";
import { setBillingProfile } from "@/lib/data/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = z.infer<typeof billingProfileSchema>;

// PATCH /api/v1/account/profile — name and bill-to address for a purchase.
export const PATCH = withRoute<Body>({
    auth: "required",
    schema: billingProfileSchema,
    handler: async ({ supabase, body }) => ok(await setBillingProfile(supabase, body)),
});
