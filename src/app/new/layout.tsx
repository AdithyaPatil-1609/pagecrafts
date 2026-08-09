import { viewer } from "@/lib/auth/session";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopBar } from "@/components/app/AppTopBar";

// The product shell around the describe screen (screen 03 — step 1 of the funnel). Signed
// out is fine: /new is reachable before anyone has an account, and the shell shows a
// sign-in affordance instead of a user.
export default async function NewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await viewer();

    return (
        <div className="flex min-h-screen flex-1">
            <AppSidebar user={user} activeHref="/new" className="hidden lg:flex" />
            <div className="flex min-w-0 flex-1 flex-col">
                <AppTopBar user={user} step={1} />
                {children}
            </div>
        </div>
    );
}
