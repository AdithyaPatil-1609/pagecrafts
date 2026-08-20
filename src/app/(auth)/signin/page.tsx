import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { landingError } from "@/lib/auth/landing-errors";
import { safeNext } from "@/lib/auth/safe-next";
import { viewer } from "@/lib/auth/session";
import { redirect } from "next/navigation";

type Params = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<Params>;
}) {
    const params = await searchParams;
    const next = safeNext(typeof params.next === "string" ? params.next : undefined);

    const user = await viewer();
    if (user) redirect(next);

    const message = landingError(typeof params.error === "string" ? params.error : undefined);
    const join = params.join === "1";

    return (
        <div className="relative">
            <SiteHeader minimal />
            <main className="mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-[1.05fr_0.95fr]">
                <div data-reveal>
                    <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                        02 — Account
                    </p>
                    <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                        Welcome <span className="hero-gold">back.</span>
                    </h1>
                    <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                        Sign in to pick up the site you were building. New here? Create an account
                        on the right — building stays free until you go live.
                    </p>
                    <Link
                        href="/"
                        className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-bloom-sky"
                    >
                        ← Back to the landing
                    </Link>
                </div>

                <div className="flex w-full flex-col items-center lg:items-end">
                    {message && (
                        <p
                            role="status"
                            className="mb-4 w-full max-w-md rounded-lg border border-border bg-secondary p-3 text-center text-sm text-secondary-foreground"
                        >
                            {message}
                        </p>
                    )}
                    <AuthCard initialMode={join ? "signup" : "signin"} next={next} />
                </div>
            </main>
        </div>
    );
}
