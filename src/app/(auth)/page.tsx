import { Hero } from "@/components/landing/Hero";
import { ValueProps } from "@/components/landing/ValueProps";
import { AuthCard } from "@/components/auth/AuthCard";

export default async function LandingPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const { error } = await searchParams;

    return (
        <main className="flex flex-1 flex-col items-center">
            <Hero />
            <section className="flex w-full flex-col items-center gap-3 px-6 pb-16">
                {error === "expired" && (
                    <p role="status" className="w-full max-w-sm rounded-md border border-border bg-secondary p-3 text-center text-sm text-secondary-foreground">
                        That link has expired or was already used. Ask for a new one below.
                    </p>
                )}
                <AuthCard />
            </section>
            <ValueProps />
        </main>
    );
}