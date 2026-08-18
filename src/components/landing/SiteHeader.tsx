import Link from "next/link";
import { BrandMark } from "@/components/landing/BrandMark";
import { buttonVariants } from "@/components/ui/button";

const NAV = [
    { label: "Templates", href: "/templates" },
    { label: "How it works", href: "#how-it-works" },
];

export function SiteHeader() {
    return (
        <header className="relative z-10 w-full">
            <nav
                aria-label="Main"
                className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-6"
            >
                <Link
                    href="/"
                    className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                    <BrandMark />
                </Link>

                <ul className="hidden items-center gap-10 md:flex">
                    {NAV.map((item) => (
                        <li key={item.label}>
                            <Link
                                href={item.href}
                                className="rounded-md text-sm font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-3 sm:gap-6">
                    <a
                        href="#sign-in"
                        className="rounded-md text-sm font-semibold text-foreground transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                    >
                        Sign in
                    </a>
                    <a
                        href="#sign-in"
                        className={buttonVariants({ variant: "brand", size: "lg", className: "rounded-lg font-semibold" })}
                    >
                        Get started
                    </a>
                </div>
            </nav>
        </header>
    );
}
