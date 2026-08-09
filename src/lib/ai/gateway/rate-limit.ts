import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Provider, ProviderQuota } from '../config';

const MINUTE_MS = 60_000;

interface Spend {
    at: number;
    tokens: number;
}

/** Somewhere a limiter's rolling window survives between processes. */
export interface WindowStore {
    load(): Spend[];
    save(window: Spend[]): void;
}

export interface LimiterDeps {
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    store?: WindowStore;
}

/**
 * Paces calls against a provider's per-minute limits.
 *
 * A free tier is usually metered on tokens per minute, not requests, and one full
 * generation can exceed a minute's token allowance on its own — so waiting between
 * generations does nothing. This holds a rolling 60s window of spend and waits
 * only as long as it takes for enough of it to age out.
 *
 * Output length is not known before the call, so a request reserves its measured
 * input plus a running estimate of output, then records the true cost afterwards.
 *
 * The window is restored from `store` when given: the provider counts spend across
 * processes, so a short-lived CLI run that starts blind would 429 on its first call
 * for tokens a previous run had already spent.
 */
export class RateLimiter {
    private window: Spend[] = [];
    private avgOutput = 800;
    private readonly now: () => number;
    private readonly sleep: (ms: number) => Promise<void>;
    private readonly store?: WindowStore;

    constructor(
        private readonly quota: Pick<ProviderQuota, 'rpm' | 'tpm'>,
        deps: LimiterDeps = {},
    ) {
        this.now = deps.now ?? Date.now;
        this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
        this.store = deps.store;
        if (this.store) {
            // Pacing must never be the reason a generation fails.
            try {
                this.window = this.store.load();
                this.prune(this.now());
            } catch {
                this.window = [];
            }
        }
    }

    private prune(at: number): void {
        while (this.window.length && at - this.window[0].at >= MINUTE_MS) this.window.shift();
    }

    private used(at: number): { tokens: number; requests: number } {
        this.prune(at);
        return {
            tokens: this.window.reduce((t, s) => t + s.tokens, 0),
            requests: this.window.length,
        };
    }

    /** How long to wait before a request costing ~`need` tokens can proceed. */
    private waitFor(need: number): number {
        const at = this.now();
        const { tokens, requests } = this.used(at);

        const overTokens = this.quota.tpm > 0 && tokens + need > this.quota.tpm;
        const overRequests = this.quota.rpm > 0 && requests + 1 > this.quota.rpm;
        if (!overTokens && !overRequests) return 0;

        // A single call larger than the whole per-minute budget can never fit;
        // waiting for an empty window is the most we can usefully do.
        if (this.window.length === 0) return 0;

        return Math.max(0, MINUTE_MS - (at - this.window[0].at));
    }

    /** Wait until this request fits inside the per-minute budget. */
    async acquire(estimatedInput: number): Promise<void> {
        const need = estimatedInput + this.avgOutput;
        // Each wait retires the oldest slice of the window, so this terminates.
        for (let wait = this.waitFor(need); wait > 0; wait = this.waitFor(need)) {
            await this.sleep(wait);
        }
    }

    /** Record what the call actually cost, and refine the output estimate. */
    record(inputTokens: number, outputTokens: number): void {
        this.window.push({ at: this.now(), tokens: inputTokens + outputTokens });
        if (outputTokens > 0) {
            this.avgOutput = Math.round(this.avgOutput * 0.7 + outputTokens * 0.3);
        }
        this.prune(this.now());
        try {
            this.store?.save(this.window);
        } catch {
            // Same rule as load: unusable state degrades pacing, never the call.
        }
    }
}

const CACHE_DIR = join(process.cwd(), 'node_modules/.cache/pagecrafts');

/**
 * A window that survives between processes, kept in the build cache.
 *
 * Every operation is fail-soft: a limiter that cannot read or write its state is
 * simply as blind as one with no store at all, which must never be fatal. Nothing
 * here runs inside the deployed app — see `defaultStore`.
 */
export function fileWindowStore(provider: Provider): WindowStore {
    const file = join(CACHE_DIR, `rate-limit-${provider}.json`);
    return {
        load(): Spend[] {
            try {
                const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
                if (!Array.isArray(raw)) return [];
                return raw.filter(
                    (s): s is Spend =>
                        !!s && typeof s === 'object'
                        && typeof (s as Spend).at === 'number'
                        && typeof (s as Spend).tokens === 'number',
                );
            } catch {
                return [];
            }
        },
        save(window: Spend[]): void {
            try {
                mkdirSync(CACHE_DIR, { recursive: true });
                writeFileSync(file, JSON.stringify(window));
            } catch {
                // Read-only or ephemeral filesystem — pacing stays in-process.
            }
        },
    };
}

/**
 * Persist only outside the Next.js runtime. Server instances are replaced and
 * scaled independently, so a local file is neither shared nor durable there —
 * cross-instance pacing is the rate limiter's job (M7.1), not this file's.
 */
function defaultStore(provider: Provider): WindowStore | undefined {
    if (process.env.NEXT_RUNTIME || process.env.VITEST) return undefined;
    return fileWindowStore(provider);
}

const limiters = new Map<Provider, RateLimiter>();

/** One limiter per provider, shared across gateway instances in the process. */
export function limiterFor(provider: Provider, quota: ProviderQuota): RateLimiter {
    let limiter = limiters.get(provider);
    if (!limiter) {
        limiter = new RateLimiter(quota, { store: defaultStore(provider) });
        limiters.set(provider, limiter);
    }
    return limiter;
}

/** Test seam — drops the shared limiters so state cannot leak between cases. */
export function resetLimiters(): void {
    limiters.clear();
}
