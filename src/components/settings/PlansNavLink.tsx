import Link from "next/link";
import { Gem } from "lucide-react";

import { cn } from "@/lib/utils";

/** Compact control that opens the User Plan page. Lives to the left of the signed-in name. */
export function PlansNavLink({ className }: { className?: string }) {
  return (
    <Link
      href="/plans"
      className={cn(
        "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-gold/55 px-2.5 text-sm font-semibold text-gold transition-colors hover:border-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        className,
      )}
    >
      <Gem className="size-4" strokeWidth={1.75} aria-hidden />
      <span>User Plan</span>
    </Link>
  );
}
