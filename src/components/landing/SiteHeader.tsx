import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandMark } from "@/components/landing/BrandMark";
import type { Viewer } from "@/lib/auth/session";

export const DECK_NAV = [
    { label: "Welcome", href: "/#welcome" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Build", href: "/#build" },
    { label: "Your sites", href: "/#sites" },
] as const;

const LINK =
    "rounded-md text-sm font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background";

export function SiteHeader({
    user,
    minimal = false,
}: {
    user?: Viewer | null;
    minimal?: boolean;
}) {
    if (minimal && !user) {
        return (
            <header className="fixed top-0 z-20 w-full">
                <nav
                    aria-label="Main"
                    className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6"
                >
                    <Link
                        href="/#top"
                        className="rounded-md font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        01 — PageCraft
                    </Link>
                    <Link href="/signin" className={LINK}>
                        Sign in
                    </Link>
                </nav>
            </header>
        );
    }

    return (
        <header className="fixed top-0 z-20 w-full border-b border-border/40 bg-background/40 backdrop-blur-xl">
            <nav
                aria-label="Main"
                className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6"
            >
                <Link
                    href={user ? "/#welcome" : "/#top"}
                    className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                    <BrandMark />
                </Link>

                <ul className="hidden items-center justify-center gap-6 lg:flex xl:gap-8">
                    {DECK_NAV.map((item) => (
                        <li key={item.label}>
                            <a href={item.href} className={LINK}>
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center justify-end gap-3 sm:gap-5">
                    <details className="relative lg:hidden">
                        <summary
                            className="flex size-9 list-none items-center justify-center rounded-md text-foreground marker:content-none [&::-webkit-details-marker]:hidden"
                        >
                            <Menu className="size-5" strokeWidth={1.75} aria-hidden />
                            <span className="sr-only">Menu</span>
                        </summary>
                        <ul className="glass-panel absolute right-0 z-30 mt-3 flex w-56 flex-col gap-1 rounded-2xl p-3">
                            {DECK_NAV.map((item) => (
                                <li key={item.label}>
                                    <a href={item.href} className={`${LINK} block px-3 py-2`}>
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </details>

                    {user ? (
                        <>
                            <span className="hidden text-sm text-muted-foreground sm:inline">
                                {user.name}
                            </span>
                            <Link href="/#settings" className={LINK}>
                                Settings
                            </Link>
                        </>
                    ) : (
                        <Link href="/signin" className={LINK}>
                            Sign in
                        </Link>
                    )}
                </div>
            </nav>
        </header>
    );
}
