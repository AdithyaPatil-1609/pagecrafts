import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/config/env";

// Read-only client for Server Components (layouts, pages). A Server Component cannot
// write cookies — attempting it throws — so this client drops the refreshed set instead.
// Nothing is lost: `proxy.ts` refreshes the session on every matching request already.
export async function supabaseViewerClient() {
  const store = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll() {
        /* the proxy owns cookie writes */
      },
    },
  });
}

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
