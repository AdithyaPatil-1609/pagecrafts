import { describe, it, expect, vi } from 'vitest';
import { persistLedgerRows } from '@/lib/ai/cost/persist';
import { rowFor } from '@/lib/ai/cost/ledger';
import type { Usage } from '@/lib/contracts';

const usage = (): Usage => ({
    provider: 'groq', model: 'm', promptVersion: 'plan.v1',
    inputTokens: 10, outputTokens: 5, latencyMs: 20,
});

describe('persistLedgerRows', () => {
    it('inserts one row per call', async () => {
        const insert = vi.fn(async () => ({ error: null }));
        const supabase = { from: vi.fn(() => ({ insert })) } as never;
        const rows = [rowFor('classify', usage(), 'completed'), rowFor('plan', usage(), 'failed')];

        await persistLedgerRows(
            supabase,
            {
                userId: '11111111-1111-4111-8111-111111111111',
                projectId: '22222222-2222-4222-8222-222222222222',
                prompt: 'a dental clinic',
            },
            rows,
        );

        expect(insert).toHaveBeenCalledOnce();
        expect(insert).toHaveBeenCalledWith([
            expect.objectContaining({
                stage: 'classify', status: 'completed', provider: 'groq',
            }),
            expect.objectContaining({
                stage: 'plan', status: 'failed', provider: 'groq',
            }),
        ]);
    });

    it('is a no-op when supabase has no .from — tests must not throw', async () => {
        await expect(persistLedgerRows({} as never, {
            userId: 'u_1', projectId: 'p_1', prompt: 'x',
        }, [rowFor('plan', usage(), 'completed')])).resolves.toBeUndefined();
    });
});
