import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignInPrompt({
    title,
    body,
    compact = false,
}: {
    title: string;
    body: string;
    compact?: boolean;
}) {
    return (
        <div
            className={cn(
                compact
                    ? "rounded-2xl border border-dashed border-border bg-card/40 px-4 py-6 text-center"
                    : "glass-panel mx-auto max-w-lg rounded-3xl p-8 text-center",
            )}
        >
            <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-2xl")}>
                {title}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
            <a
                href="/signin"
                className={buttonVariants({
                    variant: "brand",
                    className: compact ? "mt-5 rounded-xl font-semibold" : "mt-6 rounded-xl font-semibold",
                })}
            >
                Sign in
            </a>
        </div>
    );
}
