import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/config/env";

export function supabaseAdmin() {
  const env = serverEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Null when env is missing — tests and local spikes must not throw. */
export function supabaseAdminOrNull() {
  try {
    return supabaseAdmin();
  } catch {
    return null;
  }
}
