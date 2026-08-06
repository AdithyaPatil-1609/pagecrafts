import { describe, it, expect, vi } from 'vitest';
import { runOnce, forget } from '@/lib/deploy/idempotency';

describe('runOnce', () => {
    it('runs the work once for the same key', async () => {
        const work = vi.fn(async () => 'site-1');

        const first = await runOnce('key-a', work);
        const second = await runOnce('key-a', work);

        expect(first).toBe('site-1');
        expect(second).toBe('site-1');
        expect(work).toHaveBeenCalledTimes(1);
        forget('key-a');
    });

    it('runs separately for different keys', async () => {
        const work = vi.fn(async () => 'site');

        await runOnce('key-b', work);
        await runOnce('key-c', work);

        expect(work).toHaveBeenCalledTimes(2);
        forget('key-b');
        forget('key-c');
    });

    it('forgets a failure so it can be retried', async () => {
        const work = vi.fn(async () => {
            throw new Error('boom');
        });

        await expect(runOnce('key-d', work)).rejects.toThrow('boom');
        await expect(runOnce('key-d', work)).rejects.toThrow('boom');

        expect(work).toHaveBeenCalledTimes(2);
    });
});