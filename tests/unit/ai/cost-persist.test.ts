import { describe, it, expect } from 'vitest';
import { generationRowFromTable } from '@/lib/ai/cost/persist';
import { costForUser } from '@/lib/ai/cost/dashboard';

describe('load path — D20 cost-per-user query', () => {
    it('maps a generations table row onto the dashboard shape, including user id', () => {
        const row = generationRowFromTable({
            user_id: '11111111-1111-4111-8111-111111111111',
            provider: 'groq',
            model: 'gpt-oss-120b',
            stage: 'fill',
            prompt_version: 'fill-section.v3',
            input_tokens: 800,
            output_tokens: 400,
            cost_cents: 2.5,
            status: 'completed',
            latency_ms: 900,
            created_at: '2026-08-14T10:00:00.000Z',
        });

        expect(row.userId).toBe('11111111-1111-4111-8111-111111111111');
        expect(row.promptVersion).toBe('fill-section.v3');
        expect(costForUser([row], row.userId!)).toBe(2.5);
        expect(costForUser([row], 'someone-else')).toBe(0);
    });

    it('keeps an unattributed row out of a user total', () => {
        const row = generationRowFromTable({
            user_id: null,
            provider: 'groq',
            model: 'gpt-oss-120b',
            stage: 'fill',
            prompt_version: null,
            input_tokens: 1,
            output_tokens: 1,
            cost_cents: 99,
            status: 'completed',
            latency_ms: 1,
            created_at: '2026-08-14T10:00:00.000Z',
        });
        expect(row.userId).toBeNull();
        expect(row.promptVersion).toBeUndefined();
    });
});
