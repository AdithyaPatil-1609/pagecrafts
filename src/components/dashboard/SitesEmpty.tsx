import Link from "next/link";
import { LayoutGrid, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

// Nothing here yet, and the only thing worth saying is what to do about it.
//
// An empty dashboard is the second screen a new account ever sees. It should read as a
// starting point rather than as a failure, and it should offer the one action that leads
// somewhere — which is the same action the sidebar's primary button offers.
export function SitesEmpty() {
    return (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <span
                aria-hidden
                className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground"
            >
                <LayoutGrid className="size-6" strokeWidth={1.75} />
            </span>

            <p className="mt-5 text-lg font-semibold text-foreground">No sites yet</p>
            <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
                Describe what you want to build, or start from one of the designs. Everything is
                free until you publish.
            </p>

            <Link
                href="/new"
                className={buttonVariants({
                    variant: "brand",
                    className: "mt-6 rounded-xl font-semibold",
                })}
            >
                <Sparkles aria-hidden />
                Make your first site
            </Link>
        </div>
    );
}

/**
 * The dashboard could not be read.
 *
 * A retry link rather than a reload button: the page is server-rendered, so a fresh request
 * is the retry, and a link works without JavaScript.
 */
export function SitesError() {
    return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
            <p className="text-base font-semibold text-foreground">
                We could not load your sites just now.
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
                Nothing has been lost. This is usually momentary.
            </p>

            <Link
                href="/sites"
                className={buttonVariants({
                    variant: "outline-brand",
                    size: "sm",
                    className: "mt-5 rounded-lg font-medium",
                })}
            >
                Try again
            </Link>
        </div>
    );
}
