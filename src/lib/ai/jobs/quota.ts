import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '@/lib/errors/respond';
import { hasPro } from '@/lib/data/entitlements';
import { redis, isRedisConfigured } from '@/lib/limits/redis';
import { FREE_GENERATIONS_PER_PROJECT } from '@/lib/limits/config';

export type GenerationQuota = {
    used: number;
    limit: number;
    remaining: number;
    unlimited: boolean;
};

function asCount(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function redisKey(projectId: string): string {
    return `gen:free:project:${projectId}`;
}

/** Process-local counts so tests (and Redis-down) still enforce the cap. */
const localUsed = new Map<string, number>();

export function resetFreeGenerationQuota(): void {
    localUsed.clear();
}

export async function freeGenerationsUsed(projectId: string): Promise<number> {
    let remote = 0;
    if (isRedisConfigured()) {
        try {
            remote = asCount(await redis().get(redisKey(projectId)));
        } catch {
            remote = 0;
        }
    }
    return Math.max(localUsed.get(projectId) ?? 0, remote);
}

export async function recordFreeGeneration(projectId: string): Promise<number> {
    const next = (await freeGenerationsUsed(projectId)) + 1;
    localUsed.set(projectId, next);
    if (isRedisConfigured()) {
        try {
            await redis().set(redisKey(projectId), next);
        } catch (err) {
            console.warn('[quota] could not persist free generation count', err);
        }
    }
    return next;
}

async function accountIsPro(supabase: SupabaseClient, userId: string): Promise<boolean> {
    try {
        return await hasPro(supabase, userId);
    } catch {
        return false;
    }
}

export async function readGenerationQuota(
    projectId: string,
    userId: string,
    supabase: SupabaseClient,
): Promise<GenerationQuota> {
    const unlimited = await accountIsPro(supabase, userId);
    const used = await freeGenerationsUsed(projectId);
    const limit = FREE_GENERATIONS_PER_PROJECT;
    return {
        used,
        limit,
        remaining: unlimited ? limit : Math.max(0, limit - used),
        unlimited,
    };
}

export async function assertFreeGenerationAllowed(
    projectId: string,
    userId: string,
    supabase: SupabaseClient,
): Promise<GenerationQuota> {
    const quota = await readGenerationQuota(projectId, userId, supabase);
    if (!quota.unlimited && quota.used >= quota.limit) {
        throw new ApiError(
            'payment_required',
            `You have used your ${quota.limit} free generations. Pick one of the looks already made, or upgrade to generate more.`,
        );
    }
    return quota;
}
