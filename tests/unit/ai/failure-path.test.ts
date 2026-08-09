import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { withOneRepair, repairContextFor } from '@/lib/ai/generate/repair';
import { nearestTemplate } from '@/lib/ai/generate/fallback';
import { FallbackGateway } from '@/lib/ai/gateway/fallback';
import { OpenAICompatGateway } from '@/lib/ai/gateway/openai-compat';
import { GatewayError, type CompleteReply, type NamedGateway } from '@/lib/ai/gateway/provider';
import type { ProviderConfig, Provider } from '@/lib/ai/config';

const validationFailure = (issues: unknown[] = []) =>
    new GatewayError('generation_failed', 'fillSection(hero): model output failed validation',
        false, { issues, usage: { provider: 'groq', model: 'm', inputTokens: 1, outputTokens: 1, latencyMs: 1 } });

afterEach(() => vi.restoreAllMocks());

describe('failure path', () => {
    beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));

    describe('BR-09 — exactly one repair attempt', () => {
        it('does not repair when the first attempt succeeds', async () => {
            const attempt = vi.fn(async () => 'ok');
            const out = await withOneRepair(attempt);
            expect(attempt).toHaveBeenCalledOnce();
            expect(out.repaired).toBe(false);
        });

        it('repairs once when the first attempt fails validation', async () => {
            const attempt = vi.fn()
                .mockRejectedValueOnce(validationFailure())
                .mockResolvedValueOnce('fixed');
            const out = await withOneRepair(attempt);
            expect(attempt).toHaveBeenCalledTimes(2);
            expect(out.repaired).toBe(true);
            expect(out.data).toBe('fixed');
        });

        it('never attempts a third time — two failures propagate', async () => {
            const attempt = vi.fn().mockRejectedValue(validationFailure());
            await expect(withOneRepair(attempt)).rejects.toThrow(/failed validation/);
            expect(attempt).toHaveBeenCalledTimes(2);
        });

        it('passes the failing fields to the retry, not a bare instruction', async () => {
            const attempt = vi.fn()
                .mockRejectedValueOnce(validationFailure([
                    { path: ['items', 0, 'title'], message: 'expected string' },
                ]))
                .mockResolvedValueOnce('fixed');
            await withOneRepair(attempt);
            expect(attempt.mock.calls[0][0]).toBeUndefined();
            expect(attempt.mock.calls[1][0]).toContain('items.0.title');
        });

        it('does not repair a rate limit — that is the chain\'s job, not a retry', async () => {
            const attempt = vi.fn().mockRejectedValue(
                new GatewayError('rate_limited', 'HTTP 429', true));
            await expect(withOneRepair(attempt)).rejects.toThrow(/429/);
            expect(attempt).toHaveBeenCalledOnce();
        });

        // Chain exhaustion also arrives as a non-retryable generation_failed.
        it('does not repair an exhausted provider chain', async () => {
            const attempt = vi.fn().mockRejectedValue(new GatewayError(
                'generation_failed',
                'all AI providers failed — groq: timed out | gemini: 429',
                false,
                { failures: ['groq', 'gemini'], chainExhausted: true },
            ));
            await expect(withOneRepair(attempt)).rejects.toThrow(/all AI providers failed/);
            expect(attempt).toHaveBeenCalledOnce();
        });

        it('summarises issues even when the error carries no detail', () => {
            expect(repairContextFor(new Error('boom'))).toMatch(/valid JSON/);
        });
    });

    it('A3 §5.1 — a 429 advances the chain rather than surfacing', async () => {
        const reply = (p: Provider): CompleteReply => ({
            provider: p, text: 'ok', model: 'm', inputTokens: 1, outputTokens: 1, latencyMs: 1,
        });
        const groq: NamedGateway = {
            name: 'groq', configured: true,
            complete: vi.fn().mockRejectedValue(new GatewayError('rate_limited', 'HTTP 429', true)),
        };
        const gemini: NamedGateway = {
            name: 'gemini', configured: true, complete: vi.fn(async () => reply('gemini')),
        };
        const out = await new FallbackGateway([groq, gemini]).complete(
            { tier: 'fast', job: 'classify', user: 'x' });
        expect(out.provider).toBe('gemini');
    });

    it('yields one aggregate error when the whole chain fails', async () => {
        const dead = (name: Provider): NamedGateway => ({
            name, configured: true,
            complete: vi.fn().mockRejectedValue(
                new GatewayError('rate_limited', `${name} exhausted`, true)),
        });
        const err = await new FallbackGateway([dead('groq'), dead('gemini')])
            .complete({ tier: 'fast', job: 'classify', user: 'x' })
            .catch((e: unknown) => e);

        expect(err).toBeInstanceOf(GatewayError);
        const g = err as GatewayError;
        expect(g.code).toBe('generation_failed');
        expect(g.message).toContain('groq exhausted');
        expect(g.message).toContain('gemini exhausted');
    });

    it('falls back to the nearest template once generation is abandoned', () => {
        const templates = [
            { id: 'law-1', category: 'agency' as const, tags: ['formal', 'has-hero'] },
            { id: 'spa-1', category: 'other' as const, tags: ['warm', 'has-gallery'] },
        ];
        const out = nearestTemplate(
            { category: 'agency', tone: 'formal', sections: ['hero'] },
            templates,
            'all providers failed',
        );
        expect(out?.template.id).toBe('law-1');
        expect(out?.reason).toBe('all providers failed');
    });

    it('reports no template rather than inventing one when the library is empty', () => {
        expect(nearestTemplate({ category: 'agency' }, [], 'x')).toBeUndefined();
    });

    it('rejects an over-budget request before it is dispatched', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const cfg: ProviderConfig = {
            apiKey: 'k',
            models: { fast: 'f', strong: 's' },
            baseUrl: 'https://api.example.test/v1',
            quota: { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000, rpdHeadroomPct: 15, maxRequestTokens: 10 },
            pricing: { inPerMTokCents: 0, outPerMTokCents: 0 },
        };

        await expect(
            new OpenAICompatGateway('groq', cfg)
                .complete({ tier: 'strong', job: 'generate', user: 'x'.repeat(5000) }),
        ).rejects.toMatchObject({ code: 'validation_failed', retryable: false });

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
