import { classify } from '@/lib/ai/classify';
import { profile as fetchProfile } from '@/lib/ai/profile';
import { plan } from '@/lib/ai/generate/plan';
import { fillSection } from '@/lib/ai/generate/fill';
import { assemble } from '@/lib/ai/generate/assemble';
import type { Composition, SectionProps, Usage } from '@/lib/contracts';

export type Mode = 'mock' | 'plan-only' | 'full';

export interface CallRecord {
    stage: 'classify' | 'profile' | 'plan' | 'fill';
    section?: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
}

export interface SpikeResult {
    vertical: string;
    prompt: string;
    hasTemplate: boolean;
    mode: Mode;
    ok: boolean;
    error?: string;
    composition?: Composition;
    calls: CallRecord[];
    requests: number;
    modelTimeMs: number;
    wallClockMs: number;
}

export class BudgetExceeded extends Error { }

export class Budget {
    private used = 0;
    constructor(private readonly limit: number) { }

    spend(n = 1): void {
        if (this.used + n > this.limit) {
            throw new BudgetExceeded(
                `Budget exhausted: ${this.used}/${this.limit} used, ${n} requested.`,
            );
        }
        this.used += n;
    }

    refund(n = 1): void {
        this.used = Math.max(0, this.used - n);
    }

    get remaining(): number {
        return this.limit - this.used;
    }
}

function didNotConsumeQuota(err: unknown): boolean {
    const m = err instanceof Error ? err.message : String(err);
    return /\b503\b|UNAVAILABLE|ECONNRESET|fetch failed|aborted/i.test(m);
}

interface SpikeInput {
    vertical: string;
    prompt: string;
    hasTemplate: boolean;
    mode: Mode;
    budget: Budget;
}

export async function generateSpike(input: SpikeInput): Promise<SpikeResult> {
    const { vertical, prompt, hasTemplate, mode, budget } = input;
    const calls: CallRecord[] = [];
    const startedAt = Date.now();

    const record = (stage: CallRecord['stage'], usage: Usage, section?: string): void => {
        calls.push({
            stage,
            ...(section ? { section } : {}),
            model: usage.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            latencyMs: usage.latencyMs,
        });
    };

    const billed = async <T>(n: number, fn: () => Promise<T>): Promise<T> => {
        if (mode !== 'mock') budget.spend(n);
        try {
            return await fn();
        } catch (err) {
            if (mode !== 'mock' && didNotConsumeQuota(err)) budget.refund(n);
            throw err;
        }
    };

    const base = {
        vertical, prompt, hasTemplate, mode,
        get calls() { return calls; },
    };

    try {
        const intent = await billed(1, () => classify(prompt));
        record('classify', intent.usage);

        const p = await billed(1, () => fetchProfile(vertical));
        record('profile', p.usage);

        const planned = await billed(1, () => plan(prompt, intent.data, p.data));
        record('plan', planned.usage);

        const props = new Map<string, SectionProps>();

        if (mode !== 'plan-only') {
            for (const section of planned.data) {
                const filled = await billed(1, () =>
                    fillSection(section, {
                        vertical,
                        tone: intent.data.tone,
                        prompt,
                        customerWord: p.data.vocabulary.customer,
                    }),
                );
                props.set(section.id, filled.data);
                record('fill', filled.usage, `${section.type}/${section.variant}`);
            }
        } else {
            for (const section of planned.data) props.set(section.id, {});
        }

        const composition = assemble({
            vertical,
            profile: p.data,
            sections: planned.data,
            props,
            title: p.data.label,
            description: prompt.slice(0, 160),
        });

        return {
            ...base,
            ok: true,
            composition,
            calls,
            requests: calls.length,
            modelTimeMs: calls.reduce((t, c) => t + c.latencyMs, 0),
            wallClockMs: Date.now() - startedAt,
        };
    } catch (err) {
        if (err instanceof BudgetExceeded) throw err;
        return {
            ...base,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            calls,
            requests: calls.length,
            modelTimeMs: calls.reduce((t, c) => t + c.latencyMs, 0),
            wallClockMs: Date.now() - startedAt,
        };
    }
}