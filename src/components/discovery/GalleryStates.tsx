import Link from "next/link";
import { SearchX, TriangleAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// What the gallery says when it has no designs to show (D6, N-4). Each state leaves a way
// forward — a screen in this funnel is never a dead end (D-6).
//
// There is no loading skeleton here, and that is a finding rather than an omission: any
// Suspense boundary around this grid — written by hand, or created implicitly by a route
// loading.tsx — left the whole subtree unhydrated on Next 16.3 in dev. The tiles stopped
// opening their detail modal and the sort picker went dead while the page around them
// worked, which is a worse failure than having no skeleton. When the chips make the gallery
// fetch on the client (D7), the pending state belongs in that client component, where no
// boundary is involved.

/** Filters that match nothing. The way out is to loosen them, and it is one click. */
export function GalleryEmpty({ resetHref }: { resetHref: string }) {
    return (
        // `status`, not `alert`: filtering to nothing is a normal result, and an assertive
        // live region would interrupt whatever the person was reading to announce it. It
        // does have to be announced though — the grid emptying is silent otherwise, and the
        // only other signal is a heading that changes without saying so (R2 D19).
        <div
            role="status"
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center"
        >
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-accent">
                <SearchX className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <p className="text-sm font-medium text-foreground">No designs match those filters</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                Try fewer filters — or start from a blank page and describe what you want instead.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <Link href={resetHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    Clear filters
                </Link>
                <Link href="/new" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                    Describe your site
                </Link>
            </div>
        </div>
    );
}

/**
 * The library could not be read.
 *
 * Plain language, no error code, no apology longer than the fix (UI Spec §7.18). Retrying
 * is a link to the same URL rather than a button, so it works before any JavaScript has
 * loaded — which is exactly the situation where this state is most likely to be showing.
 */
export function GalleryError({ retryHref }: { retryHref: string }) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 px-6 py-12 text-center"
        >
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-background">
                <TriangleAlert className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <p className="text-sm font-medium text-foreground">We could not load the designs</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                This is our fault, not yours. Nothing you have done is lost — try again in a moment.
            </p>
            <Link
                href={retryHref}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
            >
                Try again
            </Link>
        </div>
    );
}
