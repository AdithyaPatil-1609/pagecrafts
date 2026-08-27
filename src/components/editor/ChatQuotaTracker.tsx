'use client';

import Link from 'next/link';
import { Sparkles, ArrowUpRight, Lock, AlertCircle } from 'lucide-react';
import { useEditorStore } from '@/lib/editor-store';
import { ACCOUNT_PLAN_LABEL, type AccountPlan } from '@/lib/contracts';

export default function ChatQuotaTracker() {
    const quota = useEditorStore((s) => s.editQuota);
    if (!quota) return null;

    const { remaining, limit, plan } = quota;
    const planKey = (plan as AccountPlan) in ACCOUNT_PLAN_LABEL ? (plan as AccountPlan) : 'starter';
    const planLabel = ACCOUNT_PLAN_LABEL[planKey] ?? 'Starter';
    const isExhausted = remaining <= 0;
    const isLow = remaining > 0 && remaining <= 2;
    const isPremium = planKey === 'premium';

    return (
        <div
            className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-1.5 text-xs transition-colors backdrop-blur-md ${
                isExhausted
                    ? 'border border-destructive/30 bg-destructive/10 text-destructive'
                    : isLow
                      ? 'border border-gold/30 bg-gold/10 text-gold-foreground'
                      : 'border border-border/50 bg-background/70 text-muted-foreground'
            }`}
            aria-live="polite"
        >
            <div className="flex items-center gap-1.5 truncate">
                {isExhausted ? (
                    <Lock className="size-3.5 shrink-0 text-destructive" />
                ) : isLow ? (
                    <AlertCircle className="size-3.5 shrink-0 text-gold" />
                ) : (
                    <Sparkles className="size-3.5 shrink-0 text-primary/70" />
                )}
                <span className="truncate">
                    {isExhausted ? (
                        <span>
                            No edits left on <strong>{planLabel}</strong> (0/{limit})
                        </span>
                    ) : (
                        <span>
                            <strong className="text-foreground">{remaining}</strong> of {limit} AI {remaining === 1 ? 'edit' : 'edits'} left
                        </span>
                    )}
                </span>
            </div>

            {!isPremium ? (
                <Link
                    href="/plans"
                    className="inline-flex shrink-0 items-center gap-0.5 font-medium text-foreground transition-opacity hover:opacity-80 underline underline-offset-2"
                >
                    <span>{isExhausted ? 'Upgrade to continue' : 'Need more? Upgrade'}</span>
                    <ArrowUpRight className="size-3" />
                </Link>
            ) : null}
        </div>
    );
}
