import { viewer } from "@/lib/auth/session";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopBar } from "@/components/app/AppTopBar";

// The product shell around the dashboard.
//
// Unlike /templates this is signed-in only, and the page itself redirects rather than the
// layout — the layout has no way to say "go and sign in, then come back here".
export default async function SitesLayout({ children }: { children: React.ReactNode }) {
    const user = await viewer();

    return (
        <div className="flex min-h-screen flex-1">
            <AppSidebar user={user} activeHref="/sites" className="hidden lg:flex" />
            <div className="flex min-w-0 flex-1 flex-col">
                <AppTopBar user={user} step={1} />
                {children}
            </div>
        </div>
    );
}
