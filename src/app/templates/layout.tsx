import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/landing/SiteHeader";
import { viewer } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// The full library is an in-app page for people who are already signed in. Signed-out
// visitors are sent to sign in, then on to Build — not a public catalogue.
const AFTER_SIGN_IN = "/?slide=build";

export default async function TemplatesLayout({ children }: { children: React.ReactNode }) {
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
