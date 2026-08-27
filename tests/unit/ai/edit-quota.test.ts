import { describe, expect, it, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
    assertEditAllowed,
    editsUsed,
    readEditQuota,
    recordEditUse,
    resetEditQuota,
} from '@/lib/ai/jobs/edit-quota';
import {
    STARTER_EDITS_PER_PROJECT,
    PRO_EDITS_PER_PROJECT,
    PREMIUM_EDITS_PER_PROJECT,
} from '@/lib/limits/config';
import { editsLimitForPlan } from '@/lib/payments/plans';

function mockSupabase(plan: 'starter' | 'pro' | 'premium' = 'starter'): SupabaseClient {
    const entitlements: Array<{ kind: string; source: string; status: string; expires_at: string | null; project_id: string | null }> = [];
    if (plan === 'pro') {
        entitlements.push({ kind: 'pro', source: 'pro', status: 'active', expires_at: null, project_id: null });
    } else if (plan === 'premium') {
        entitlements.push({ kind: 'premium', source: 'pro', status: 'active', expires_at: null, project_id: null });
    }

    return {
        from: (table: string) => {
            if (table === 'entitlements') {
                return {
                    select: () => ({
                        eq: () => Promise.resolve({ data: entitlements, error: null }),
                    }),
                };
            }
            return {
                select: () => Promise.resolve({ data: [], error: null }),
            };
        },
    } as unknown as SupabaseClient;
}

describe('AI chatbot edit quota', () => {
    beforeEach(() => {
        resetEditQuota();
    });

    it('returns correct edit limits per plan', () => {
        expect(editsLimitForPlan('starter')).toBe(STARTER_EDITS_PER_PROJECT);
        expect(editsLimitForPlan('starter')).toBe(10);
        expect(editsLimitForPlan('pro')).toBe(PRO_EDITS_PER_PROJECT);
        expect(editsLimitForPlan('pro')).toBe(20);
        expect(editsLimitForPlan('premium')).toBe(PREMIUM_EDITS_PER_PROJECT);
        expect(editsLimitForPlan('premium')).toBe(30);
    });

    it('allows up to 10 edits on Starter and blocks on the 11th', async () => {
        const projectId = 'proj-starter-test';
        const userId = 'user-1';
        const supabase = mockSupabase('starter');

        for (let i = 0; i < 10; i++) {
            const quota = await assertEditAllowed(projectId, userId, supabase);
            expect(quota.canEdit).toBe(true);
            expect(quota.used).toBe(i);
            expect(quota.limit).toBe(10);
            expect(quota.remaining).toBe(10 - i);
            await recordEditUse(projectId);
        }

        expect(await editsUsed(projectId)).toBe(10);

        await expect(assertEditAllowed(projectId, userId, supabase)).rejects.toThrow(
            /You have used your 10 Starter AI chatbot edits on this site\. Upgrade to Pro \(20 edits\) or Premium \(30 edits\)/,
        );
    });

    it('allows up to 20 edits on Pro and blocks on the 21st', async () => {
        const projectId = 'proj-pro-test';
        const userId = 'user-2';
        const supabase = mockSupabase('pro');

        for (let i = 0; i < 20; i++) {
            const quota = await assertEditAllowed(projectId, userId, supabase);
            expect(quota.canEdit).toBe(true);
            expect(quota.limit).toBe(20);
            await recordEditUse(projectId);
        }

        expect(await editsUsed(projectId)).toBe(20);

        await expect(assertEditAllowed(projectId, userId, supabase)).rejects.toThrow(
            /You have used your 20 Pro AI chatbot edits on this site\. Upgrade to Premium \(30 edits\)/,
        );
    });

    it('allows up to 30 edits on Premium and blocks on the 31st', async () => {
        const projectId = 'proj-premium-test';
        const userId = 'user-3';
        const supabase = mockSupabase('premium');

        for (let i = 0; i < 30; i++) {
            const quota = await assertEditAllowed(projectId, userId, supabase);
            expect(quota.canEdit).toBe(true);
            expect(quota.limit).toBe(30);
            await recordEditUse(projectId);
        }

        expect(await editsUsed(projectId)).toBe(30);

        await expect(assertEditAllowed(projectId, userId, supabase)).rejects.toThrow(
            /You have used your 30 Premium AI chatbot edits on this site\./,
        );
    });

    it('tracks quota independently per project', async () => {
        const userId = 'user-shared';
        const supabase = mockSupabase('starter');

        for (let i = 0; i < 10; i++) {
            await recordEditUse('proj-a');
        }

        expect((await readEditQuota('proj-a', userId, supabase)).canEdit).toBe(false);
        expect((await readEditQuota('proj-b', userId, supabase)).canEdit).toBe(true);
        expect((await readEditQuota('proj-b', userId, supabase)).remaining).toBe(10);
    });
});
