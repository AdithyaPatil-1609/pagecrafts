import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '@/lib/errors/respond';
import { accountPlan } from '@/lib/data/entitlements';
import { redis, isRedisConfigured } from '@/lib/limits/redis';
import type { AccountPlan } from '@/lib/contracts';
import { ACCOUNT_PLAN_LABEL } from '@/lib/contracts';
import { editsLimitForPlan } from '@/lib/payments/plans';

export type EditQuota = {
    used: number;
    limit: number;
    remaining: number;
    plan: AccountPlan;
    canEdit: boolean;
};

function asCount(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function usedKey(projectId: string): string {
    return `edit:project:${projectId}`;
}

/** Process-local counts so tests (and Redis-down) still enforce the cap. */
const localUsed = new Map<string, number>();

export function resetEditQuota(): void {
    localUsed.clear();
}

export async function editsUsed(projectId: string): Promise<number> {
    let remote = 0;
    if (isRedisConfigured()) {
        try {
            remote = asCount(await redis().get(usedKey(projectId)));
        } catch {
            remote = 0;
        }
    }
    return Math.max(localUsed.get(projectId) ?? 0, remote);
}

export async function bumpEditUsed(projectId: string): Promise<number> {
    const next = (await editsUsed(projectId)) + 1;
    localUsed.set(projectId, next);
    if (isRedisConfigured()) {
        try {
            await redis().set(usedKey(projectId), next);
        } catch (err) {
            console.warn('[edit-quota] could not persist edit count', err);
        }
    }
    return next;
}

export async function recordEditUse(projectId: string): Promise<number> {
    return bumpEditUsed(projectId);
}

export async function readEditQuota(
    projectId: string,
    userId: string,
    supabase: SupabaseClient,
): Promise<EditQuota> {
    const plan = await accountPlan(supabase, userId);
    const limit = editsLimitForPlan(plan);
    const used = await editsUsed(projectId);
    const remaining = Math.max(0, limit - used);
    return {
        used,
        limit,
        remaining,
        plan,
        canEdit: remaining > 0,
    };
}

export async function assertEditAllowed(
    projectId: string,
    userId: string,
    supabase: SupabaseClient,
): Promise<EditQuota> {
    const quota = await readEditQuota(projectId, userId, supabase);
    if (quota.canEdit) return quota;

    const label = ACCOUNT_PLAN_LABEL[quota.plan];
    const upgrade =
        quota.plan === 'starter'
            ? 'Upgrade to Pro (20 edits) or Premium (30 edits) on User Plans.'
            : quota.plan === 'pro'
              ? 'Upgrade to Premium (30 edits) on User Plans.'
              : '';

    throw new ApiError(
        'payment_required',
        `You have used your ${quota.limit} ${label} AI chatbot edits on this site. ${upgrade}`.trim(),
    );
}
