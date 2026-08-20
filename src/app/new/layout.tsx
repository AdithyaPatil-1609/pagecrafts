import { viewer } from "@/lib/auth/session";
import { FlowSteps } from "@/components/app/FlowSteps";
import { SiteHeader } from "@/components/landing/SiteHeader";

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
        <>
            <SiteHeader user={user} />
            <div className="flex min-h-screen flex-1 flex-col pt-16">
                <div className="flex justify-center border-b border-border/40 px-6 py-3">
                    <FlowSteps current={1} />
                </div>
                {children}
            </div>
        </>
    );
}
