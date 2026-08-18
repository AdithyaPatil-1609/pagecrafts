import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { consentSchema } from "@/lib/contracts/schemas";
import { setTrainingConsent } from "@/lib/data/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = z.infer<typeof consentSchema>;

// PATCH /api/v1/account/consent — training-data consent, on or off.
//
// Its own route rather than a field on a general account PATCH, because it is the only thing
// on the account a person may change and because it is the one that matters: consent is off
// by default and cannot be retrofitted, so the act of granting it should be a request of its
// own that a log can show plainly.
export const PATCH = withRoute<Body>({
  auth: "required",
  schema: consentSchema,
  handler: async ({ supabase, body }) => ok(await setTrainingConsent(supabase, body.trainingOptIn)),
});
