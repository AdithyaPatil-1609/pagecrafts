import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/limits/redis', async () => {
    const support = await import('../../support/redis-mock');
    return { redis: () => support.redisStub, isRedisConfigured: () => true };
});

vi.mock('@/lib/data/entitlements', () => ({
    hasPro: vi.fn(async () => false),
}));

import { resetRedisMock } from '../../support/redis-mock';
import { ApiError } from '@/lib/errors/respond';
import {
    assertFreeGenerationAllowed,
    freeGenerationsUsed,
    recordFreeGeneration,
    resetFreeGenerationQuota,
} from '@/lib/ai/jobs/quota';
import { FREE_GENERATIONS_PER_PROJECT } from '@/lib/limits/config';
import { hasPro } from '@/lib/data/entitlements';

const db = {} as SupabaseClient;

beforeEach(() => {
    resetRedisMock();
    resetFreeGenerationQuota();
    vi.mocked(hasPro).mockResolvedValue(false);
});

describe('free generation quota', () => {
    it('starts at zero and counts each generation', async () => {
        expect(await freeGenerationsUsed('p_1')).toBe(0);
        expect(await recordFreeGeneration('p_1')).toBe(1);
        expect(await recordFreeGeneration('p_1')).toBe(2);
        expect(await freeGenerationsUsed('p_1')).toBe(2);
        expect(await freeGenerationsUsed('p_2')).toBe(0);
    });

    it('refuses a sixth generation until they pay', async () => {
        for (let i = 0; i < FREE_GENERATIONS_PER_PROJECT; i++) {
            await recordFreeGeneration('p_1');
        }

        await expect(assertFreeGenerationAllowed('p_1', 'u_1', db))
            .rejects.toMatchObject({
                code: 'payment_required',
            });
        expect(await assertFreeGenerationAllowed('p_1', 'u_1', db).catch((err: ApiError) => err.message))
            .toMatch(/5 free generations/);
    });

    it('lets a Pro account keep generating', async () => {
        vi.mocked(hasPro).mockResolvedValue(true);
        for (let i = 0; i < FREE_GENERATIONS_PER_PROJECT; i++) {
            await recordFreeGeneration('p_1');
        }
        await expect(assertFreeGenerationAllowed('p_1', 'u_1', db)).resolves.toMatchObject({
            unlimited: true,
        });
    });
});
