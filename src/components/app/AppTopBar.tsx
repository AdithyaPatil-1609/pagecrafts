import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import type { Viewer } from "@/lib/auth/session";
import { BrandMark } from "@/components/landing/BrandMark";
import { FlowSteps } from "@/components/app/FlowSteps";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export function AppTopBar({
    user,
    step,
}: {
    user: Viewer | null;
    step: 1 | 2 | 3;
}) {
    return (
        <header className="flex h-20 w-full shrink-0 items-center gap-4 border-b border-border px-6 lg:border-b-0">
            {/* The sidebar carries the lockup from lg up; below that it lives here. */}
            <Link href="/" className="lg:hidden">
                <BrandMark />
            </Link>

            <div className="hidden flex-1 justify-center lg:flex">
                <FlowSteps current={step} />
            </div>

            {/* No room for the full stepper on a phone, but never no sense of place. */}
            <span className="hidden text-sm text-muted-foreground sm:inline lg:hidden">
                Step {step} of 3
            </span>

            <div className="ml-auto flex items-center gap-3 lg:ml-0">
                {/* The sidebar's main action, kept reachable while the sidebar is hidden. */}
                <Link
                    href="/new"
                    className={buttonVariants({
                        variant: "brand",
                        className: "rounded-lg font-semibold lg:hidden",
                    })}
                >
                    <Plus aria-hidden />
                    New
                </Link>

                <span className="hidden items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground sm:flex">
                    <Sparkles className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
                    AI Assistant
                    <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                        Soon
                    </Badge>
                </span>

                {user ? (
                    <span
                        title={user.email}
                        className="flex size-9 items-center justify-center rounded-full border border-primary/40 text-sm font-semibold uppercase text-foreground"
                    >
                        <span aria-hidden>{user.name.slice(0, 1)}</span>
                        <span className="sr-only">Signed in as {user.email}</span>
                    </span>
                ) : (
                    <Link
                        href="/#sign-in"
                        className="rounded-md text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        Sign in
                    </Link>
                )}
            </div>
        </header>
    );
}
