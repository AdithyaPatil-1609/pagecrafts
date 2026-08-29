"use client";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LockedPlanNotice } from "@/components/discovery/LockedPlanNotice";
import { cn } from "@/lib/utils";
import { styleBadge, styleTileLabel } from "@/lib/payments/pricing";
import type { StyleTier } from "@/lib/ai/generate/styles";

// The full-size look preview (opened from a card on /choose).
//
// The card thumbnails are deliberately dead — scaled down and pointer-events-none — so a
// stray click inside someone's generated site cannot be mistaken for choosing it. That
// makes the thumbnail unreadable at 0.56 scale, which is what this dialog is for: the same
// HTML, at full width, scrollable and interactive, with the decision still an explicit
// button rather than anything you can trip over inside the frame.
//
// The iframe keeps `allow-scripts` and nothing else. Generated markup is not trusted, so it
// never gets `allow-same-origin` — that pair would hand the page our own origin.

export interface LookPreview {
    id: string;
    label: string;
    blurb: string;
    tier: StyleTier;
    html: string;
}

export function LookPreviewDialog({
    look,
    unlocked,
    choosing,
    onClose,
    onChoose,
}: {
    /** The look being viewed, or null when the dialog is shut. */
    look: LookPreview | null;
    unlocked: boolean;
    choosing: boolean;
    onClose: () => void;
    onChoose: () => void;
}) {
    const badge = look ? styleBadge(look.tier) : null;

    return (
        <Dialog open={Boolean(look)} onOpenChange={(next) => !next && onClose()}>
            {look ? (
                <DialogContent className="flex h-[88vh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
                    <DialogHeader className="shrink-0 gap-1 border-b border-border px-5 py-4 pr-14">
                        <div className="flex flex-wrap items-center gap-2">
                            <DialogTitle className="text-base">{look.label}</DialogTitle>
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                                    unlocked || look.tier === "free"
                                        ? "border border-border bg-background text-foreground"
                                        : "bg-primary text-primary-foreground",
                                )}
                            >
                                {!unlocked ? (
                                    <Lock className="size-3" strokeWidth={2} aria-hidden />
                                ) : null}
                                {styleTileLabel(look.tier, { unlocked })}
                            </span>
                        </div>
                        <DialogDescription>{look.blurb}</DialogDescription>
                    </DialogHeader>

                    {/* Scrolls and runs like the real page — this is the whole point of opening it. */}
                    <iframe
                        title={`${look.label} — full preview`}
                        srcDoc={look.html}
                        sandbox="allow-scripts"
                        className="min-h-0 w-full flex-1 border-0 bg-white"
                    />

                    <div className="shrink-0 border-t border-border px-5 py-3">
                        {unlocked ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    variant="outline-brand"
                                    className="min-h-11 cursor-pointer rounded-lg font-semibold"
                                    onClick={onClose}
                                >
                                    Keep looking
                                </Button>
                                <Button
                                    variant="brand"
                                    className="min-h-11 cursor-pointer rounded-lg font-semibold"
                                    disabled={choosing}
                                    onClick={onChoose}
                                >
                                    {choosing ? "Setting up your site…" : `Use ${look.label}`}
                                </Button>
                            </div>
                        ) : badge ? (
                            <LockedPlanNotice badge={badge} kind="look" />
                        ) : null}
                    </div>
                </DialogContent>
            ) : null}
        </Dialog>
    );
}
