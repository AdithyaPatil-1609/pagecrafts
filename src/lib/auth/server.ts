import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/config/env";

export async function supabaseRouteClient() {
  const store = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(items) {
        for (const { name, value, options } of items) {
          store.set(name, value, options);
        }
      },
    },
  });
}
