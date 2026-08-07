import { describe, it, expect, vi } from 'vitest';
import { pollUntilLive } from '@/lib/deploy/verify';

function fakeClock() {
    let t = 0;
    return {
        now: () => t,
        sleep: async (ms: number) => {
            t += ms;
        },
    };
}

describe('pollUntilLive', () => {
    it('stops as soon as the address answers', async () => {
        const check = vi.fn(async () => 200);
        expect(await pollUntilLive('https://x', { ...fakeClock(), check })).toBe(true);
        expect(check).toHaveBeenCalledTimes(1);
    });

    it('keeps trying until it answers', async () => {
        let calls = 0;
        const check = async () => (++calls < 4 ? 404 : 200);
        expect(await pollUntilLive('https://x', { ...fakeClock(), check })).toBe(true);
        expect(calls).toBe(4);
    });

    it('gives up at the 90 second ceiling', async () => {
        const check = vi.fn(async () => 404);
        const live = await pollUntilLive('https://x', {
            ...fakeClock(),
            check,
            intervalMs: 3000,
            timeoutMs: 90000,
        });
        expect(live).toBe(false);
        expect(check).toHaveBeenCalledTimes(30);
    });
});