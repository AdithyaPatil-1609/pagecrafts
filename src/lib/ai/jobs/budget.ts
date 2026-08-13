import { aiConfig } from '../config';
import type { ErrorCode } from '@/lib/contracts';
import { upstashGenerationCounters } from './counters';

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
 * Daily generation counters. Redis-backed in production; tests swap via
 * `setGenerationCounters`.
 */
let counters: GenerationCounters = upstashGenerationCounters;

export function setGenerationCounters(next: GenerationCounters | null): void {
    counters = next ?? upstashGenerationCounters;
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
