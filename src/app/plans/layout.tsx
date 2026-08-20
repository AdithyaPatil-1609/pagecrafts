import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/landing/SiteHeader";
import { viewer } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const AFTER_SIGN_IN = "/plans";

export default async function PlansLayout({ children }: { children: React.ReactNode }) {
  const user = await viewer();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(AFTER_SIGN_IN)}`);
  }

  return (
    <>
      <SiteHeader user={user} />
      <div className="flex min-h-screen flex-1 flex-col pt-16">{children}</div>
    </>
  );
}
