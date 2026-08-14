/**
 * D18 — generation/quota caps, verified without spending a live provider.
 *
 * A 30-corpus Groq run is a quality eval, not a cap check — and a 429 on that
 * run is a quota event, never a quality miss. This script paces a burst
 * against the same RateLimiter and daily-generation counters the product uses,
 * with a fake clock, and reports whether anything would have gone out over
 * budget.
 *
 *   npm run verify:caps
 */

import { RateLimiter } from '@/lib/ai/gateway/rate-limit';
import { AI_DAILY_PER_USER } from '@/lib/limits/config';
import { aiConfig } from '@/lib/ai/config';

const CALLS_PER_GENERATION = 9;
const MEAN_INPUT = 514;
const MEAN_OUTPUT = 429;
const GENERATIONS = 30;

function clock() {
    let t = 1_000_000;
    let waited = 0;
    return {
        deps: {
            now: () => t,
            sleep: async (ms: number) => {
                waited += ms;
                t += ms;
            },
        },
        get waited() {
            return waited;
        },
        get elapsed() {
            return t - 1_000_000;
        },
    };
}

async function verifyProviderPacing(): Promise<{ ok: boolean; lines: string[] }> {
    const { rpm, tpm } = aiConfig().providers.groq.quota;
    const c = clock();
    const limiter = new RateLimiter({ rpm, tpm }, c.deps);

    for (let g = 0; g < GENERATIONS; g += 1) {
        for (let i = 0; i < CALLS_PER_GENERATION; i += 1) {
            await limiter.acquire(MEAN_INPUT);
            limiter.record(MEAN_INPUT, MEAN_OUTPUT);
        }
    }

    const tokens = GENERATIONS * CALLS_PER_GENERATION * (MEAN_INPUT + MEAN_OUTPUT);
    const mustWait = tpm > 0 && tokens > tpm;
    const ok = !mustWait || c.waited > 0;

    return {
        ok,
        lines: [
            `## Provider pacing (Groq ${rpm} rpm / ${tpm} tpm)`,
            '',
            `${GENERATIONS} generations × ${CALLS_PER_GENERATION} calls ≈ ${tokens.toLocaleString()} tokens.`,
            `Waited ${(c.waited / 1000).toFixed(1)}s of virtual time; wall clock was not spent.`,
            ok
                ? 'Limiter waited rather than dispatching over TPM/RPM.'
                : 'FAILED — burst fitted in one window; the limiter did not pace.',
            '',
            '429s are quota events. They are not quality misses and must not be scored as such.',
        ],
    };
}

/**
 * Mirrors `checkGenerationBudget` without importing the Redis-backed counters
 * (those pull `server-only` and cannot run from a tsx CLI). The unit test
 * (`generation-budget.test.ts`) is the one that imports the real function.
 */
function checkCap(input: {
    used: number;
    limit: number;
    exhausted: boolean;
    prompt: string;
}): { ok: true } | { ok: false; message: string } {
    const ceiling = aiConfig().providers[aiConfig().provider].quota.maxRequestTokens;
    if (Math.ceil(input.prompt.length / 4) > ceiling) {
        return { ok: false, message: 'TOO_LONG' };
    }
    if (input.used >= input.limit) {
        return { ok: false, message: 'DAILY_CAP_REACHED' };
    }
    if (input.exhausted) {
        return { ok: false, message: 'PROJECT_QUOTA_EXHAUSTED' };
    }
    return { ok: true };
}

async function verifyGenerationCaps(): Promise<{ ok: boolean; lines: string[] }> {
    const allowed: string[] = [];
    const denied: string[] = [];
    let used = 0;

    for (let i = 0; i < AI_DAILY_PER_USER.requests + 5; i += 1) {
        const verdict = checkCap({
            used,
            limit: AI_DAILY_PER_USER.requests,
            exhausted: false,
            prompt: 'a dental clinic',
        });
        if (verdict.ok) {
            used += 1;
            allowed.push('ok');
        } else {
            denied.push(verdict.message);
        }
    }

    const dailyHeld = denied.length === 5 && denied.every((m) => m === 'DAILY_CAP_REACHED')
        && allowed.length === AI_DAILY_PER_USER.requests;

    const project = checkCap({
        used: 0,
        limit: AI_DAILY_PER_USER.requests,
        exhausted: true,
        prompt: 'a dental clinic',
    });
    const projectHeld = !project.ok && project.message === 'PROJECT_QUOTA_EXHAUSTED';

    const ok = dailyHeld && projectHeld;
    return {
        ok,
        lines: [
            '## Generation caps (per-user daily + project budget)',
            '',
            `Daily limit ${AI_DAILY_PER_USER.requests}. Burst of ${AI_DAILY_PER_USER.requests + 5}.`,
            dailyHeld
                ? `First ${AI_DAILY_PER_USER.requests} allowed; the rest returned DAILY_CAP_REACHED.`
                : `FAILED daily cap — allowed ${allowed.length}, denied ${denied.length} (${[...new Set(denied)].join(', ')}).`,
            projectHeld
                ? 'Spent project budget returns PROJECT_QUOTA_EXHAUSTED without dispatching.'
                : 'FAILED project budget.',
            '',
            'The live function is `checkGenerationBudget` — see tests/unit/ai/generation-budget.test.ts.',
        ],
    };
}

async function main(): Promise<void> {
    const pacing = await verifyProviderPacing();
    const caps = await verifyGenerationCaps();
    const report = [
        '# D18 — cap verification',
        '',
        'No provider was called. A live 30-corpus run is a quality eval; this is not one.',
        '',
        ...pacing.lines,
        '',
        ...caps.lines,
    ].join('\n');

    console.log(report);
    if (!pacing.ok || !caps.ok) process.exit(1);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
