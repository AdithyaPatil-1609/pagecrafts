import { describe, it, expect, vi } from 'vitest';
import { persistLedger, persistLedgerRows } from '@/lib/ai/cost/persist';
import { rowFor } from '@/lib/ai/cost/ledger';
import type { LedgerRow } from '@/lib/ai/cost/ledger';
import type { Usage } from '@/lib/contracts';

const usage = (): Usage => ({
    provider: 'groq', model: 'm', promptVersion: 'plan.v1',
    inputTokens: 10, outputTokens: 5, latencyMs: 20,
});

const row: LedgerRow = {
    stage: 'plan',
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    promptVersion: 'plan.v2',
    inputTokens: 120,
    outputTokens: 80,
    costCents: 0.25,
    status: 'completed',
    latencyMs: 450,
    createdAt: '2026-08-13T17:30:00.000Z',
};

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

describe('persistLedger', () => {
    it('writes invocation rows with exact job attribution and no raw prompt', async () => {
        const insert = vi.fn().mockResolvedValue({ error: null });
        const from = vi.fn(() => ({ insert }));

        await persistLedger({ from } as never, {
            jobId: 'job_123',
            userId: 'user-1',
            projectId: 'project-1',
            prompt: 'a private customer description',
        }, [row]);

        expect(from).toHaveBeenCalledWith('generations');
        const [payload] = insert.mock.calls[0] as [Record<string, unknown>[]];
        expect(payload[0]).toMatchObject({
            job_id: 'job_123',
            user_id: 'user-1',
            project_id: 'project-1',
            provider: 'groq',
            stage: 'plan',
            input_tokens: 120,
            output_tokens: 80,
        });
        expect(payload[0].prompt_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(JSON.stringify(payload)).not.toContain('private customer description');
    });

    it('does not issue an empty insert', async () => {
        const from = vi.fn();
        await persistLedger({ from } as never, {
            jobId: 'job_empty',
            userId: 'user-1',
            projectId: 'project-1',
            prompt: 'anything',
        }, []);
        expect(from).not.toHaveBeenCalled();
    });

    it('surfaces database errors to the runner lifecycle', async () => {
        const from = vi.fn(() => ({
            insert: vi.fn().mockResolvedValue({ error: { message: 'permission denied' } }),
        }));

        await expect(persistLedger({ from } as never, {
            jobId: 'job_123',
            userId: 'user-1',
            projectId: 'project-1',
            prompt: 'anything',
        }, [row])).rejects.toThrow('permission denied');
    });
});
