import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildGateway, chainFor } from '@/lib/ai/gateway';
import { FallbackGateway } from '@/lib/ai/gateway/fallback';
import { loadAiConfig } from '@/lib/ai/config';

afterEach(() => vi.restoreAllMocks());

describe('buildGateway / chainFor', () => {
    it('D1: only GROQ_API_KEY set — chain has one provider and no fallback wrapper', () => {
        const cfg = loadAiConfig({ GROQ_API_KEY: 'g' });
        expect(chainFor(cfg).map((g) => g.name)).toEqual(['groq']);
        expect(buildGateway(cfg)).not.toBeInstanceOf(FallbackGateway);
    });

    it('D1: only GROQ_API_KEYS set — groq is still configured', () => {
        const cfg = loadAiConfig({ GROQ_API_KEYS: 'g1,g2' });
        expect(chainFor(cfg).map((g) => g.name)).toEqual(['groq']);
        expect(buildGateway(cfg)).not.toBeInstanceOf(FallbackGateway);
    });

    it('wraps two configured providers in a FallbackGateway, in order', () => {
        const cfg = loadAiConfig({
            AI_PROVIDER_ORDER: 'groq,gemini',
            GROQ_API_KEY: 'g',
            GEMINI_API_KEY: 'x',
        });
        expect(chainFor(cfg).map((g) => g.name)).toEqual(['groq', 'gemini']);
        expect(buildGateway(cfg)).toBeInstanceOf(FallbackGateway);
    });

    it('D2: no key at all — build throws "set at least one"', () => {
        expect(() => buildGateway(loadAiConfig({}))).toThrow(/at least one/i);
    });

    it('skips a provider that has no key even if it is listed in the order', () => {
        const cfg = loadAiConfig({ AI_PROVIDER_ORDER: 'groq,cerebras', CEREBRAS_API_KEY: 'c' });
        expect(chainFor(cfg).map((g) => g.name)).toEqual(['cerebras']);
    });

    it('leaves gemini and cerebras out of the chain unless the order names them', () => {
        const cfg = loadAiConfig({ GROQ_API_KEY: 'g', CEREBRAS_API_KEY: 'c', GEMINI_API_KEY: 'x' });
        expect(chainFor(cfg).map((g) => g.name)).toEqual(['groq']);
    });
});
