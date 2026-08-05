import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { ApiError } from '@/lib/errors/respond';

export async function supabaseRoute() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        },
      },
    },
  );
}

export async function requireUser() {
  const supabase = await supabaseRoute();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new ApiError('unauthorized', 'Please sign in.');
  }

  return { supabase, userId: data.user.id };
}
import "server-only";
import type { User } from "@supabase/supabase-js";
import { supabaseRouteClient } from "@/lib/auth/server";

export type SessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
};

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email ?? "",
    emailVerified: user.email_confirmed_at !== null && user.email_confirmed_at !== undefined,
    createdAt: user.created_at,
  };
}

export async function currentUser(): Promise<SessionUser | null> {
  const supabase = await supabaseRouteClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  return toSessionUser(data.user);
}
