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
