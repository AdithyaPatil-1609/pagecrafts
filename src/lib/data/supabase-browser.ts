import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/env";

export function supabaseBrowser() {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
