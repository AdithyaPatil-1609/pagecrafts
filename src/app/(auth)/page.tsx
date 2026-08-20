import { Hero } from "@/components/landing/Hero";
import { LandingBackdrop } from "@/components/landing/LandingBackdrop";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { ValueProps } from "@/components/landing/ValueProps";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { landingError } from "@/lib/auth/landing-errors";
import { currentUser } from "@/lib/auth/session";

export default async function LandingPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; mode?: string }>;
}) {
    const { error, mode } = await searchParams;

    // Somebody already signed in has no business being shown a sign-in form. This is
    // what made confirming an email look like it had not worked: the session was
    // created, but anything that landed on / showed the form again, so the only
    // evidence of being signed in was invisible.
    if (!error && (await currentUser())) {
        redirect("/new");
    }

    const message = landingError(error);
    const initialMode = mode === "signin" || mode === "forgot" ? mode : "signup";

    return (
        <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
            <LandingBackdrop />
            <SiteHeader />

            <main className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-start gap-16 px-6 pt-10 pb-24 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-14 lg:pt-16">
                <Hero />

                <div className="flex w-full flex-col items-center gap-3 justify-self-center lg:justify-self-end">
                    {message && (
                        <p
                            role="status"
                            className="w-full max-w-md rounded-lg border border-border bg-secondary p-3 text-center text-sm text-secondary-foreground"
                        >
                            {message}
                        </p>
                    )}
                    <AuthCard initialMode={initialMode} />
                </div>
            </main>

            <ValueProps />
        </div>
    );
}
