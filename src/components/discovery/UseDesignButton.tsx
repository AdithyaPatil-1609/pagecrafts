"use client";

import Link from "next/link";

import type { TemplateTier } from "@/lib/contracts";
import { buttonVariants } from "@/components/ui/button";

// "Use this design" (R3 D8).
//
// If the user is not signed in, they are redirected to sign in first, then
// returned to the brief screen with this design pre-selected.

export function UseDesignButton({
    forkId,
    name,
    tier,
    showPayNote = true,
    unlocked = false,
    signedIn = true,
}: {
    forkId: string;
    name: string;
    tier: TemplateTier;
    showPayNote?: boolean;
    unlocked?: boolean;
    signedIn?: boolean;
}) {
    const briefHref = `/new?template=${encodeURIComponent(forkId)}`;
    const href = signedIn
        ? briefHref
        : `/signin?next=${encodeURIComponent(briefHref)}`;
    const needsPlan = tier !== "free" && !unlocked;

    return (
        <div className="flex flex-col items-end gap-1.5">
            <Link
                href={href}
                aria-label={signedIn ? `Use ${name}` : `Sign in to use ${name}`}
                className={buttonVariants({ variant: "brand", size: "lg" }) + " cursor-pointer"}
            >
                {signedIn ? "Use this design" : "Sign in to use"}
            </Link>
            {!signedIn ? (
                <span className="text-xs text-muted-foreground">
                    Sign in first to use this design.
                </span>
            ) : showPayNote && needsPlan ? (
                <span className="text-xs text-muted-foreground">
                    {tier === "signature"
                        ? "Needs Premium plan."
                        : "Needs Pro plan."}
                </span>
            ) : null}
        </div>
    );
}
