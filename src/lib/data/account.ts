import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountResponse } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";
import { supabaseAdmin } from "./supabase-admin";

// The account page's data (M-account).
//
// All three operations go through the caller's own client wherever they can, so RLS is what
// decides whose account this is — `users_select_own` and `users_update_own` are both keyed
// on auth.uid(), and the grant is narrowed to the three columns a person may change. There
// is no user id parameter here on purpose: a function that took one could be called with
// somebody else's.

export async function getAccount(supabase: SupabaseClient): Promise<AccountResponse> {
  const { data, error } = await supabase
    .from("users")
    .select("email, email_verified, training_opt_in, created_at")
    .maybeSingle();

  if (error) throw new ApiError("internal", "Could not read your account.", error.message);
  if (!data) throw new ApiError("not_found", "That account does not exist.");

  return {
    email: data.email as string,
    emailVerified: Boolean(data.email_verified),
    trainingOptIn: Boolean(data.training_opt_in),
    createdAt: data.created_at as string,
  };
}

/**
 * Turn training-data consent on or off.
 *
 * Off by default and never inferred: the plan's rule is that consent cannot be retrofitted,
 * which means the only thing that may set this true is the person, on this page, on purpose.
 * The grant is `update (handle, avatar_url, training_opt_in)`, so this statement is the most
 * the database would allow a signed-in client to do even if it asked for more.
 */
export async function setTrainingConsent(
  supabase: SupabaseClient,
  trainingOptIn: boolean,
): Promise<AccountResponse> {
  // The filter is deliberate even though it excludes nothing. PostgREST can be configured to
  // refuse an UPDATE that carries no filter at all, and a statement whose safety depends on a
  // server setting is not a statement worth writing. RLS is still what decides which row this
  // reaches; this only makes the request well-formed on its own terms.
  const { error } = await supabase
    .from("users")
    .update({ training_opt_in: trainingOptIn })
    .not("id", "is", null);

  if (error) {
    throw new ApiError("internal", "Could not save that preference.", error.message);
  }

  return getAccount(supabase);
}

/**
 * Delete the account and everything it owns.
 *
 * Needs the service role, and only for this: removing a row from auth.users is not something
 * a signed-in client can be allowed to do, and everything else follows from it — public.users
 * references auth.users on delete cascade, and projects, files, commits, deployments and
 * assets cascade from there. Generations keep their cost rows with a null user, which is
 * accounting history rather than personal data (ASM-10).
 *
 * What this does not touch is a published site. It is the person's, on hosting they were
 * given, and deleting an account is not a request to take their website off the internet
 * (C-12). That is a separate decision and deserves to be asked separately.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);

  if (error) {
    throw new ApiError("internal", "Could not delete your account.", error.message);
  }
}
