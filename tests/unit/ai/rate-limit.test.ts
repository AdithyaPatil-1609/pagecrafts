import { describe, it, expect } from 'vitest';
import { RateLimiter, type WindowStore } from '@/lib/ai/gateway/rate-limit';

/** An in-memory stand-in for the on-disk window. */
function memoryStore(): WindowStore & { data: { at: number; tokens: number }[] } {
    const s = {
        data: [] as { at: number; tokens: number }[],
        load: () => s.data,
        save: (w: { at: number; tokens: number }[]) => { s.data = [...w]; },
    };
    return s;
}

/** A controllable clock: sleeping advances virtual time instead of real time. */
function clock() {
    let t = 1_000_000;
    const waits: number[] = [];
    return {
        waits,
        deps: {
            now: () => t,
            sleep: async (ms: number) => { waits.push(ms); t += ms; },
        },
        advance: (ms: number) => { t += ms; },
    };
}

// Groq's published gpt-oss free tier.
const GROQ = { rpm: 30, tpm: 8_000 };

describe('RateLimiter', () => {
    it('does not wait while the window has room', async () => {
        const c = clock();
        const l = new RateLimiter(GROQ, c.deps);
        await l.acquire(500);
        expect(c.waits).toEqual([]);
    });

    it('waits once the per-minute token budget is spent', async () => {
        const c = clock();
        const l = new RateLimiter(GROQ, c.deps);
        l.record(4_000, 3_500);       // 7,500 of 8,000 used
        await l.acquire(1_000);        // 1,000 + ~800 estimate does not fit
        expect(c.waits.length).toBe(1);
        expect(c.waits[0]).toBeGreaterThan(0);
        expect(c.waits[0]).toBeLessThanOrEqual(60_000);
    });

    it('waits only for the remainder of the window, not a full minute', async () => {
        const c = clock();
        const l = new RateLimiter(GROQ, c.deps);
        l.record(4_000, 3_500);
        c.advance(45_000);             // 45s of the minute already elapsed
        await l.acquire(1_000);
        expect(c.waits[0]).toBe(15_000);
    });

    it('proceeds again once spend has aged out of the window', async () => {
        const c = clock();
        const l = new RateLimiter(GROQ, c.deps);
        l.record(4_000, 3_500);
        c.advance(60_001);
        await l.acquire(1_000);
        expect(c.waits).toEqual([]);
    });

    it('respects requests per minute as well as tokens', async () => {
        const c = clock();
        const l = new RateLimiter({ rpm: 2, tpm: 1_000_000 }, c.deps);
        l.record(1, 1);
        l.record(1, 1);
        await l.acquire(10);
        expect(c.waits.length).toBe(1);
    });

    it('never deadlocks on a call larger than the whole budget', async () => {
        const c = clock();
        const l = new RateLimiter(GROQ, c.deps);
        await l.acquire(50_000);
        expect(c.waits).toEqual([]);
    });

    it('is inert when the provider publishes no token limit', async () => {
        const c = clock();
        const l = new RateLimiter({ rpm: 0, tpm: 0 }, c.deps);
        for (let i = 0; i < 50; i++) l.record(9_000, 9_000);
        await l.acquire(9_000);
        expect(c.waits).toEqual([]);
    });

    // The cross-process gap: a fresh run must not start blind, or it 429s on its
    // first call for tokens a previous run already spent.
    it('restores a window written by an earlier process', async () => {
        const store = memoryStore();
        const c1 = clock();
        const first = new RateLimiter(GROQ, { ...c1.deps, store });
        first.record(4_000, 3_500);
        expect(store.data).toHaveLength(1);

        // A new process, same wall clock — the budget is still spent.
        const c2 = clock();
        const second = new RateLimiter(GROQ, { ...c2.deps, store });
        await second.acquire(1_000);
        expect(c2.waits.length).toBe(1);
    });

    it('ignores restored spend that has already aged out', async () => {
        const store = memoryStore();
        store.data = [{ at: 1_000_000 - 120_000, tokens: 7_500 }];
        const c = clock();
        const l = new RateLimiter(GROQ, { ...c.deps, store });
        await l.acquire(1_000);
        expect(c.waits).toEqual([]);
    });

    it('survives a corrupt or unreadable store — pacing degrades, calls do not fail', async () => {
        const broken: WindowStore = {
            load: () => { throw new Error('unreadable'); },
            save: () => { throw new Error('unwritable'); },
        };
        const c = clock();
        const l = new RateLimiter(GROQ, { ...c.deps, store: broken });
        expect(() => l.record(100, 100)).not.toThrow();
        await expect(l.acquire(100)).resolves.toBeUndefined();
    });

    // The real shape of the problem: ten calls of one generation, back to back.
    it('paces a full generation across the minute boundary', async () => {
        const c = clock();
        const l = new RateLimiter(GROQ, c.deps);

        for (let i = 0; i < 10; i++) {
            await l.acquire(514);      // measured mean input per call
            l.record(514, 429);        // measured mean output per call
        }

        // 9,426 tokens against an 8,000 TPM budget cannot fit in one minute.
        expect(c.waits.length).toBeGreaterThan(0);
        expect(c.waits.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    });
});
