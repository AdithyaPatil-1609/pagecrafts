import { Hero } from "@/components/landing/Hero";
import { LandingBackdrop } from "@/components/landing/LandingBackdrop";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { ValueProps } from "@/components/landing/ValueProps";
import { AuthCard } from "@/components/auth/AuthCard";

export default async function LandingPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const { error } = await searchParams;

    return (
        <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
            <LandingBackdrop />
            <SiteHeader />

            <main className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-start gap-16 px-6 pt-10 pb-24 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-14 lg:pt-16">
                <Hero />

                <div className="flex w-full flex-col items-center gap-3 justify-self-center lg:justify-self-end">
                    {error === "expired" && (
                        <p
                            role="status"
                            className="w-full max-w-md rounded-lg border border-border bg-secondary p-3 text-center text-sm text-secondary-foreground"
                        >
                            That link has expired or was already used. Ask for a new one below.
                        </p>
                    )}
                    <AuthCard />
                </div>
            </main>

            <ValueProps />
        </div>
    );
}
