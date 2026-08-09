import { aiConfig, type Provider, type ProviderPricing } from '../config';
import type { Usage } from '@/lib/contracts';

export type GenerationStatus = 'completed' | 'failed' | 'rejected';

/** The per-provider rate card, read from config unless a caller supplies one. */
function pricingTable(): Partial<Record<Provider, ProviderPricing>> {
    const { providers } = aiConfig();
    return {
        gemini: providers.gemini.pricing,
        groq: providers.groq.pricing,
        cerebras: providers.cerebras.pricing,
    };
}

/** One row per model invocation — successful or not (M3.8, NFR-142). */
export interface LedgerRow {
    stage: string;
    provider: Provider | 'unknown';
    model: string;
    promptVersion?: string;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
    status: GenerationStatus;
    latencyMs: number;
    createdAt: string;
}

/**
 * Price a call against the provider that served it.
 *
 * Costing a Groq call at Gemini's rate produces a wrong number that looks real,
 * and NFR-142 requires reconciling to within 5% of the invoice — so the rate
 * always comes from the recorded provider, never from a shared default.
 */
export function costCentsFor(
    provider: Provider | 'unknown',
    inputTokens: number,
    outputTokens: number,
    rates: Partial<Record<Provider, ProviderPricing>> = pricingTable(),
): number {
    const pricing = provider === 'unknown' ? undefined : rates[provider];
    if (!pricing) return 0;
    const cents =
        (inputTokens / 1_000_000) * pricing.inPerMTokCents +
        (outputTokens / 1_000_000) * pricing.outPerMTokCents;
    return Number(cents.toFixed(4));
}

export function rowFor(
    stage: string,
    usage: Usage,
    status: GenerationStatus,
    now: () => Date = () => new Date(),
): LedgerRow {
    const provider = (usage.provider ?? 'unknown') as Provider | 'unknown';
    return {
        stage,
        provider,
        model: usage.model,
        promptVersion: usage.promptVersion,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costCents: costCentsFor(provider, usage.inputTokens, usage.outputTokens),
        status,
        latencyMs: usage.latencyMs,
        createdAt: now().toISOString(),
    };
}

/**
 * Collects ledger rows for one generation. The sink is deliberately in-memory:
 * persistence lands with the `generations` table on D9, and this keeps the
 * accounting testable and provider-correct before then.
 */
export class CostLedger {
    private readonly rows: LedgerRow[] = [];

    add(stage: string, usage: Usage, status: GenerationStatus): LedgerRow {
        const row = rowFor(stage, usage, status);
        this.rows.push(row);
        return row;
    }

    all(): readonly LedgerRow[] {
        return this.rows;
    }

    get totals() {
        return this.rows.reduce(
            (t, r) => ({
                calls: t.calls + 1,
                inputTokens: t.inputTokens + r.inputTokens,
                outputTokens: t.outputTokens + r.outputTokens,
                costCents: Number((t.costCents + r.costCents).toFixed(4)),
                failed: t.failed + (r.status === 'completed' ? 0 : 1),
            }),
            { calls: 0, inputTokens: 0, outputTokens: 0, costCents: 0, failed: 0 },
        );
    }

    /** Spend split by provider — the shape NFR-142 reconciliation needs. */
    byProvider(): Record<string, { calls: number; costCents: number; tokens: number }> {
        const out: Record<string, { calls: number; costCents: number; tokens: number }> = {};
        for (const r of this.rows) {
            const e = (out[r.provider] ??= { calls: 0, costCents: 0, tokens: 0 });
            e.calls += 1;
            e.costCents = Number((e.costCents + r.costCents).toFixed(4));
            e.tokens += r.inputTokens + r.outputTokens;
        }
        return out;
    }
}
