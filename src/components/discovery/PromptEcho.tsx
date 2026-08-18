import Link from "next/link";
import { Pencil, Sparkles } from "lucide-react";

// What the user typed on the intent screen, shown back to them above the results so the
// grid is visibly an answer to their words — and editable, because getting it wrong
// should cost one click, not a lost trail (FR-002).
export function PromptEcho({ text, editHref }: { text: string; editHref: string }) {
    return (
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-xl border border-primary/30 bg-card/60 px-4 py-3">
            <Sparkles className="size-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
            <p className="min-w-0 flex-1 truncate text-sm text-foreground" title={text}>
                {text}
            </p>
            <Link
                href={editHref}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-sm font-medium text-brand-ink transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Pencil className="size-3.5" aria-hidden />
                Edit
            </Link>
        </div>
    );
}
