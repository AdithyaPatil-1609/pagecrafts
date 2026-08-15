import { viewer } from "@/lib/auth/session";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopBar } from "@/components/app/AppTopBar";

export default async function ChooseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await viewer();

    return (
        <div className="flex min-h-screen flex-1">
            <AppSidebar user={user} activeHref="/new" className="hidden lg:flex" />
            <div className="flex min-w-0 flex-1 flex-col">
                <AppTopBar user={user} step={2} />
                {children}
            </div>
        </div>
    );
}
