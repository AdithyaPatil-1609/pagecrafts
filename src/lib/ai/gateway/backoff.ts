/** Longest wait we will sit through rather than advancing the provider chain. */
export const MAX_BACKOFF_MS = 30_000;
export const MAX_RATE_LIMIT_ATTEMPTS = 3;

export interface BackoffClock {
    sleep(ms: number): Promise<void>;
    /** 0..1. Injected so tests can pin jitter. */
    jitter(): number;
}

const realtime: BackoffClock = {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    jitter: Math.random,
};

let clock: BackoffClock = realtime;

export function setBackoffClock(next: BackoffClock | null): void {
    clock = next ?? realtime;
}

export function backoffClock(): BackoffClock {
    return clock;
}

/**
 * How long to wait before retry `attempt` (0-based).
 *
 * A `Retry-After` of 0 means retry immediately. A positive value is honoured
 * up to the cap. When the header is absent (`-1`), exponential backoff with
 * full jitter: `base * 2^attempt` scaled by `0.5 + jitter()`.
 */
export function delayForAttempt(attempt: number, retryAfterMs: number): number {
    if (retryAfterMs === 0) return 0;
    if (retryAfterMs > 0) return Math.min(retryAfterMs, MAX_BACKOFF_MS);

    const base = 250 * 2 ** attempt;
    const jittered = base * (0.5 + clock.jitter());
    return Math.min(Math.round(jittered), MAX_BACKOFF_MS);
}

export function isRateLimitError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return /\b429\b|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg);
}
