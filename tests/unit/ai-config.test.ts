import { describe, it, expect } from 'vitest';
import { loadAiConfig } from '@/lib/ai/config';

const base = { GEMINI_API_KEY: 'test-key' };

describe('loadAiConfig', () => {
    it('throws a named error when the key is missing', () => {
        expect(() => loadAiConfig({})).toThrow(/GEMINI_API_KEY/);
    });

    it('falls back to the measured free-tier limits', () => {
        const cfg = loadAiConfig(base);
        expect(cfg.quota.rpd).toBe(20);
        expect(cfg.quota.rpm).toBe(5);
    });

    it('reads limits from the environment as numbers', () => {
        const cfg = loadAiConfig({ ...base, GEMINI_RPD: '1500' } as NodeJS.ProcessEnv);
        expect(cfg.quota.rpd).toBe(1500);
    });

    it('rejects a limit that is not a number', () => {
        expect(() => loadAiConfig({ ...base, GEMINI_RPM: 'lots' } as NodeJS.ProcessEnv)).toThrow();
    });

    it('splits models into fast and strong tiers', () => {
        const cfg = loadAiConfig(base as NodeJS.ProcessEnv);
        expect(cfg.models.fast).toContain('lite');
        expect(cfg.models.strong).not.toContain('lite');
    });
});