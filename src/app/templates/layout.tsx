import { viewer } from "@/lib/auth/session";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopBar } from "@/components/app/AppTopBar";

// The product shell around the gallery. Signed out is fine — /templates is browsable
// before anyone has an account, and the shell shows a sign-in affordance instead of a user.
export default async function TemplatesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await viewer();

    return (
        <div className="flex min-h-screen flex-1">
            <AppSidebar
                user={user}
                activeHref="/templates"
                className="hidden lg:flex"
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <AppTopBar user={user} step={2} />
                {children}
            </div>
        </div>
    );
}
