import { describe, it, expect } from 'vitest';
import { analyse } from '../../../evals/spike/analysis';
import type { SpikeResult } from '../../../evals/spike/pipeline';

/** One `full` generation of `calls` requests, each costing `tokens/calls` tokens. */
function run(calls: number, tokens: number): SpikeResult {
    const per = tokens / calls;
    return {
        vertical: 'dental-clinic', prompt: 'x', hasTemplate: false, mode: 'full', ok: true,
        calls: Array.from({ length: calls }, () => ({
            stage: 'fill' as const,
            model: 'gpt-oss-120b',
            inputTokens: per / 2,
            outputTokens: per / 2,
            latencyMs: 1000,
        })),
        requests: calls, modelTimeMs: 13_000, wallClockMs: 13_000,
    };
}

// The measured D5 generation: 10 calls, 9,426 tokens.
const GROQ = { rpd: 1_000, tpm: 8_000, tpd: 200_000 };

describe('capacity analysis — the binding limit', () => {
    it('reports tokens/day as binding when it runs out first', () => {
        const a = analyse([run(10, 9_426)], GROQ);
        expect(a.bindingLimit).toBe('tokens/day');
        // Far below the 85 a request-only model predicts.
        expect(a.projectedGenerationsPerDay).toBe(18);
    });

    it('reports requests/day as binding when tokens are plentiful', () => {
        const a = analyse([run(10, 500)], GROQ);
        expect(a.bindingLimit).toBe('requests/day');
        expect(a.projectedGenerationsPerDay).toBe(85);
    });

    it('flags a generation that alone exceeds the per-minute token budget', () => {
        expect(analyse([run(10, 9_426)], GROQ).exceedsTpm).toBe(true);
        expect(analyse([run(10, 4_000)], GROQ).exceedsTpm).toBe(false);
    });

    it('ignores token limits a provider does not publish', () => {
        const a = analyse([run(10, 9_426)], { rpd: 20, tpm: 0, tpd: 0 });
        expect(a.bindingLimit).toBe('requests/day');
        expect(a.projectedGenerationsPerDay).toBe(1);
    });

    it('still accepts a bare rpd number, as the old callers passed', () => {
        expect(analyse([run(10, 9_426)], 1_000).projectedGenerationsPerDay).toBe(85);
    });

    it('excludes repair-path runs from the latency corpus (TC-036)', () => {
        const clean = run(10, 9_426);
        const repaired: SpikeResult = {
            ...run(12, 11_000),
            repairs: ['hero: invalid'],
            modelTimeMs: 80_000,
        };
        const a = analyse([clean, repaired], GROQ);
        expect(a.generations).toBe(1);
        expect(a.meanModelTimeMs).toBe(clean.modelTimeMs);
    });

    it('does not average plan-only runs with full ones (TC-036)', () => {
        const full = run(10, 9_426);
        const planOnly: SpikeResult = {
            ...run(3, 1_000),
            mode: 'plan-only',
            modelTimeMs: 4_000,
        };
        const a = analyse([full, planOnly], GROQ);
        expect(a.generations).toBe(1);
        expect(a.meanRequests).toBe(10);
    });
});
