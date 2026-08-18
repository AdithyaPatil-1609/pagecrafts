import { viewer } from "@/lib/auth/session";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopBar } from "@/components/app/AppTopBar";

// Same shell as the dashboard, so moving between them does not feel like two websites.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
    const user = await viewer();

    return (
        <div className="flex min-h-screen flex-1">
            <AppSidebar user={user} activeHref="/settings" className="hidden lg:flex" />
            <div className="flex min-w-0 flex-1 flex-col">
                <AppTopBar user={user} step={1} />
                {children}
            </div>
        </div>
    );
}
