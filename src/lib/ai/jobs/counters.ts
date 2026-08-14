import { redis, isRedisConfigured } from '@/lib/limits/redis';
import { utcDay, secondsUntilUtcMidnight } from '@/lib/limits/spend';
import { AI_DAILY_PER_USER } from '@/lib/limits/config';
import type { GenerationCounters } from './budget';

function asCount(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

/** Upstash-backed daily generation counters (D9). Falls back to zero when Redis is down. */
export const upstashGenerationCounters: GenerationCounters = {
    async userDailyUsed(userId) {
        if (!isRedisConfigured()) return 0;
        try {
            return asCount(await redis().get(`gen:user:${userId}:${utcDay()}`));
        } catch {
            return 0;
        }
    },
    userDailyLimit() {
        return AI_DAILY_PER_USER.requests;
    },
    async projectBudgetExhausted(projectId) {
        if (!isRedisConfigured()) return false;
        try {
            const flag = await redis().get(`gen:project:${projectId}:exhausted`);
            return flag === '1' || flag === 1 || flag === true;
        } catch {
            return false;
        }
    },
};

export async function recordGenerationUse(userId: string, projectId: string): Promise<void> {
    if (!isRedisConfigured()) return;
    const ttl = secondsUntilUtcMidnight();
    const day = utcDay();
    try {
        const client = redis();
        const userKey = `gen:user:${userId}:${day}`;
        const used = asCount(await client.get(userKey)) + 1;
        await client.set(userKey, used, { ex: ttl });
        const projectKey = `gen:project:${projectId}:${day}`;
        const projectUsed = asCount(await client.get(projectKey)) + 1;
        await client.set(projectKey, projectUsed, { ex: ttl });
    } catch (err) {
        console.warn('[budget] could not record generation use', err);
    }
}
