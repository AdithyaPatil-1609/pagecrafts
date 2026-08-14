import { describe, it, expect, afterEach } from 'vitest';
import { checkGenerationBudget, setGenerationCounters } from '@/lib/ai/jobs/budget';
import { AI_DAILY_PER_USER } from '@/lib/limits/config';

afterEach(() => {
    setGenerationCounters(null);
});

describe('generation caps under a burst — D18', () => {
    it('refuses the request past the per-user daily cap, before any provider call', async () => {
        let used = 0;
        setGenerationCounters({
            async userDailyUsed() { return used; },
            userDailyLimit() { return AI_DAILY_PER_USER.requests; },
            async projectBudgetExhausted() { return false; },
        });

        for (let i = 0; i < AI_DAILY_PER_USER.requests; i += 1) {
            const verdict = await checkGenerationBudget('u1', 'p1', 'a dental clinic');
            expect(verdict.ok, `request ${i + 1}`).toBe(true);
            used += 1;
        }

        const blocked = await checkGenerationBudget('u1', 'p1', 'a dental clinic');
        expect(blocked).toEqual({
            ok: false,
            code: 'rate_limited',
            message: 'DAILY_CAP_REACHED',
        });
    });

    it('refuses when the shared project budget is spent', async () => {
        setGenerationCounters({
            async userDailyUsed() { return 0; },
            userDailyLimit() { return AI_DAILY_PER_USER.requests; },
            async projectBudgetExhausted() { return true; },
        });

        const blocked = await checkGenerationBudget('u1', 'p1', 'a dental clinic');
        expect(blocked).toMatchObject({
            ok: false,
            message: 'PROJECT_QUOTA_EXHAUSTED',
        });
    });

    it('does not treat a 429 as a quality miss — the code is rate_limited', async () => {
        setGenerationCounters({
            async userDailyUsed() { return 10_000; },
            userDailyLimit() { return 1; },
            async projectBudgetExhausted() { return false; },
        });

        const blocked = await checkGenerationBudget('u1', 'p1', 'a dental clinic');
        expect(blocked.ok).toBe(false);
        if (!blocked.ok) expect(blocked.code).toBe('rate_limited');
    });
});
