import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ProviderQuota } from '../config';

const MINUTE_MS = 60_000;

interface Spend {
    at: number;
    tokens: number;
}

/** Where a limiter's window survives between processes. */
export interface WindowStore {
    load(): Spend[];
    save(window: Spend[]): void;
}

export interface LimiterDeps {
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    store?: WindowStore;
}

/** Paces calls against a provider's per-minute limits using a rolling 60s window. */
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
            // Pacing must never be why a generation fails.
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

        // A call larger than the whole budget can never fit.
        if (this.window.length === 0) return 0;

        return Math.max(0, MINUTE_MS - (at - this.window[0].at));
    }

    /** Wait until this request fits the per-minute budget; returns ms spent waiting. */
    async acquire(estimatedInput: number): Promise<number> {
        const need = estimatedInput + this.avgOutput;
        let waited = 0;
        // Each wait retires the oldest slice, so this terminates.
        for (let wait = this.waitFor(need); wait > 0; wait = this.waitFor(need)) {
            await this.sleep(wait);
            waited += wait;
        }
        return waited;
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
            // Unusable state degrades pacing, never the call.
        }
    }
}

const CACHE_DIR = join(process.cwd(), 'node_modules/.cache/pagecrafts');

/** Kept in the build cache. Fail-soft: unreadable state just means no pacing. */
export function fileWindowStore(slot: string): WindowStore {
    const safe = slot.replace(/[^a-z0-9:_-]+/gi, '-');
    const file = join(CACHE_DIR, `rate-limit-${safe}.json`);
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
                // Read-only or ephemeral filesystem.
            }
        },
    };
}

/** Persist store state only outside Next.js runtime / test environments. */
function defaultStore(slot: string): WindowStore | undefined {
    if (process.env.NEXT_RUNTIME || process.env.VITEST) return undefined;
    return fileWindowStore(slot);
}

const limiters = new Map<string, RateLimiter>();

/**
 * One limiter per slot. Groq keys each get `groq:0`, `groq:1`, … so five orgs
 * are paced as five free tiers, not one shared 8k TPM.
 */
export function limiterFor(slot: string, quota: ProviderQuota): RateLimiter {
    let limiter = limiters.get(slot);
    if (!limiter) {
        limiter = new RateLimiter(quota, { store: defaultStore(slot) });
        limiters.set(slot, limiter);
    }
    return limiter;
}

/** Test seam — drops the shared limiters so state cannot leak between cases. */
export function resetLimiters(): void {
    limiters.clear();
}
