"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CATEGORY_LABELS } from "@/lib/discovery/categories";
import type { TemplateSummary } from "@/lib/templates/query";
import { templateBadge } from "@/lib/payments/pricing";
import { TemplatePreview } from "@/components/discovery/TemplatePreview";
import { TemplateDetailModal } from "@/components/discovery/TemplateDetailModal";
import { PriceBadge } from "@/components/discovery/PriceBadge";
import { CardIndex } from "@/components/ui/card-index";
import { useUnlockPaidDesign } from "@/hooks/useUnlockPaidDesign";
import { cn } from "@/lib/utils";

function looksLikeSignIn(message: string): boolean {
    return /sign in/i.test(message);
}

function CardFace({
    template,
    index,
    compact,
    showPrice,
    locked,
}: {
    template: TemplateSummary;
    index: number;
    compact: boolean;
    showPrice: boolean;
    locked: boolean;
}) {
    return (
        <>
            <span className="relative block overflow-hidden">
                <CardIndex n={index} compact={compact} />
                <span className={cn("block", locked && "opacity-55")}>
                    {template.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={template.thumbnailUrl}
                            alt=""
                            width={640}
                            height={400}
                            loading={index <= 4 ? "eager" : "lazy"}
                            fetchPriority={index <= 4 ? "high" : "auto"}
                            decoding="async"
                            className="block aspect-[16/10] w-full bg-muted object-cover object-top"
                        />
                    ) : (
                        <TemplatePreview preview={template.preview} priority={index <= 4} />
                    )}
                </span>

                {showPrice ? (
                    <PriceBadge
                        tier={template.tier}
                        priceInr={template.priceInr}
                        locked={locked}
                        className="absolute right-2 top-2 z-[2] shadow-sm"
                    />
                ) : null}
            </span>

            <span
                className={
                    compact
                        ? "relative z-[1] flex items-center justify-between gap-2 border-t border-border px-2 py-1.5"
                        : "relative z-[1] flex items-center justify-between gap-3 border-t border-border px-3 py-2.5"
                }
            >
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {template.name}
                </span>
                {compact ? null : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {CATEGORY_LABELS[template.category]}
                    </span>
                )}
            </span>

            <span className="sr-only">{template.description}</span>
        </>
    );
}

export function TemplateCard({
    template,
    index,
    compact = false,
    showPrice = true,
    lockable = false,
    unlocked = true,
    forkId,
}: {
    template: TemplateSummary;
    index: number;
    compact?: boolean;
    showPrice?: boolean;
    lockable?: boolean;
    unlocked?: boolean;
    forkId?: string;
}) {
    const router = useRouter();
    const badge = templateBadge(template.tier);
    const paidLocked = lockable && Boolean(badge) && !unlocked;
    const [bought, setBought] = useState(false);
    const { unlockTemplate, status, error } = useUnlockPaidDesign();
    const locked = paidLocked && !bought;

    async function buy() {
        if (!forkId) return;
        try {
            const ok = await unlockTemplate(forkId);
            if (!ok) return;
            setBought(true);
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Payment failed.";
            if (looksLikeSignIn(message)) {
                router.push(`/signin?next=${encodeURIComponent("/templates")}`);
            }
        }
    }

    return (
        <article className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card focus-within:border-primary/40">
            <TemplateDetailModal
                templateId={template.id}
                templateName={template.name}
                showPrice={showPrice}
                locked={locked}
                buyBusy={status === "loading" || status === "open" || status === "verifying"}
                buyError={error}
                onBuy={locked ? () => void buy() : undefined}
            >
                <button
                    type="button"
                    aria-label={
                        locked
                            ? `${template.name}, ${badge} design, locked. Rs ${template.priceInr}.`
                            : undefined
                    }
                    className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <CardFace
                        template={template}
                        index={index}
                        compact={compact}
                        showPrice={showPrice}
                        locked={locked}
                    />
                </button>
            </TemplateDetailModal>
        </article>
    );
}
