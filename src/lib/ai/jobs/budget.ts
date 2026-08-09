import { aiConfig } from '../config';
import type { ErrorCode } from '@/lib/contracts';

export type BudgetVerdict =
    | { ok: true }
    | { ok: false; code: ErrorCode; message: string };

export interface GenerationCounters {
    /** Requests this user has already spent today. */
    userDailyUsed(userId: string): Promise<number>;
    userDailyLimit(): number;
    /** True when the shared project budget is spent or the kill switch is tripped. */
    projectBudgetExhausted(projectId: string): Promise<boolean>;
}

/**
 * Stub standing in for E1's M7.1 counters. Called behind this interface so the
 * three pre-checks exist in the route from the start rather than being retrofitted;
 * swap `setGenerationCounters` when the real ones land.
 */
const permissive: GenerationCounters = {
    async userDailyUsed() { return 0; },
    userDailyLimit() { return Number.MAX_SAFE_INTEGER; },
    async projectBudgetExhausted() { return false; },
};

let counters: GenerationCounters = permissive;

export function setGenerationCounters(next: GenerationCounters | null): void {
    counters = next ?? permissive;
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/** The three pre-dispatch checks, in cost order: cheapest and most local first. */
export async function checkGenerationBudget(
    userId: string,
    projectId: string,
    prompt: string,
): Promise<BudgetVerdict> {
    const ceiling = aiConfig().providers[aiConfig().provider].quota.maxRequestTokens;
    if (estimateTokens(prompt) > ceiling) {
        return {
            ok: false,
            code: 'validation_failed',
            message: 'That description is too long to generate from.',
        };
    }

    if (await counters.userDailyUsed(userId) >= counters.userDailyLimit()) {
        return {
            ok: false,
            code: 'rate_limited',
            message: 'DAILY_CAP_REACHED',
        };
    }

    if (await counters.projectBudgetExhausted(projectId)) {
        return {
            ok: false,
            code: 'hosting_error',
            message: 'PROJECT_QUOTA_EXHAUSTED',
        };
    }

    return { ok: true };
}
