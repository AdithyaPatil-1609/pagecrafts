import { describe, it, expect, vi, afterEach } from 'vitest';
import { CostLedger, costCentsFor, rowFor } from '@/lib/ai/cost/ledger';
import type { Usage } from '@/lib/contracts';

const usage = (over: Partial<Usage> = {}): Usage => ({
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    promptVersion: 'plan.v1',
    inputTokens: 500,
    outputTokens: 400,
    latencyMs: 1200,
    ...over,
});

afterEach(() => vi.restoreAllMocks());

describe('cost ledger (M3.8)', () => {
    it('writes one row per call, successful or failed', () => {
        const l = new CostLedger();
        l.add('classify', usage(), 'completed');
        l.add('plan', usage(), 'failed');

        expect(l.all()).toHaveLength(2);
        expect(l.totals.calls).toBe(2);
        expect(l.totals.failed).toBe(1);
    });

    // B6 — a failed call still cost tokens and must not vanish from the ledger.
    it('counts tokens for a failed call', () => {
        const l = new CostLedger();
        l.add('plan', usage(), 'failed');
        expect(l.totals.inputTokens).toBe(500);
        expect(l.totals.outputTokens).toBe(400);
    });

    it('carries provider, model and prompt version on every row', () => {
        const row = rowFor('plan', usage(), 'completed');
        expect(row.provider).toBe('groq');
        expect(row.model).toBe('openai/gpt-oss-120b');
        expect(row.promptVersion).toBe('plan.v1');
        expect(row.status).toBe('completed');
    });

    it('falls back to "unknown" rather than mislabelling an unattributed call', () => {
        expect(rowFor('plan', usage({ provider: undefined }), 'completed').provider)
            .toBe('unknown');
    });

    // NFR-142 — a Groq call priced at Gemini's rate is a wrong number that looks real.
    it('prices each provider at its own rate', () => {
        const rates = {
            groq: { inPerMTokCents: 10, outPerMTokCents: 20 },
            gemini: { inPerMTokCents: 1, outPerMTokCents: 2 },
        };
        expect(costCentsFor('groq', 1_000_000, 1_000_000, rates)).toBe(30);
        expect(costCentsFor('gemini', 1_000_000, 1_000_000, rates)).toBe(3);
        // An unattributed call is never guessed at another provider's rate.
        expect(costCentsFor('unknown', 1_000_000, 1_000_000, rates)).toBe(0);
    });

    it('splits spend by provider for invoice reconciliation', () => {
        const l = new CostLedger();
        l.add('classify', usage({ provider: 'groq' }), 'completed');
        l.add('plan', usage({ provider: 'gemini', model: 'gemini-3.5-flash' }), 'completed');
        l.add('fill', usage({ provider: 'gemini', model: 'gemini-3.5-flash' }), 'failed');

        const split = l.byProvider();
        expect(split.groq.calls).toBe(1);
        expect(split.gemini.calls).toBe(2);
        expect(split.gemini.tokens).toBe(1800);
    });
});
