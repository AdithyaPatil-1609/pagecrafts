import { timeoutFor } from './tiers';
import {
    GatewayError,
    type CompleteReply,
    type CompleteRequest,
    type Gateway,
    type NamedGateway,
} from './provider';

/**
 * Decide whether a failure should advance the chain or stop it.
 *
 * The chain covers **availability, not quality**. It advances when a provider is
 * rate-limited, unreachable, unfunded or misconfigured — all provider-specific,
 * so the next one may well serve. It stops immediately on a request-shape fault
 * (`validation_failed`, a non-retryable 400), because that fault reproduces
 * identically at every provider and advancing would burn the chain to learn
 * nothing. Downstream Zod validation throws *outside* the gateway, so it never
 * reaches here: quality failures were never the chain's job.
 */
const ADVANCE_ON: ReadonlySet<string> = new Set([
    'rate_limited', 'unauthorized', 'forbidden', 'payment_required',
    'spend_capped', 'not_found', 'hosting_error',
]);

/** Faults that will not fix themselves mid-run, so the provider is dropped. */
const TERMINAL: ReadonlySet<string> = new Set([
    'unauthorized', 'forbidden', 'payment_required',
]);

function shouldAdvance(err: unknown): boolean {
    if (err instanceof GatewayError) {
        if (err.code === 'validation_failed') return false;
        return err.retryable || ADVANCE_ON.has(err.code);
    }
    // Unknown / network-shaped errors — try the next provider.
    return true;
}

/**
 * Tries a chain of providers in priority order under a single overall deadline.
 *
 * With the default chain this means: Groq first, then Cerebras when Groq is
 * exhausted or unavailable, and finally Gemini as the last resort. The whole
 * request shares one budget (B3 / NFR-003), so three providers cannot stack
 * three timeouts — each attempt runs against the remaining time.
 */
export class FallbackGateway implements Gateway {
    /** Repeating conditions already reported, so a dead provider logs once. */
    private readonly warned = new Set<string>();

    /**
     * Providers dropped for this gateway's lifetime. A missing key or an unfunded
     * account will not recover mid-run, and re-attempting it buys only a wasted
     * round-trip on every later call before the working provider serves.
     */
    private readonly disabled = new Set<string>();

    constructor(
        private readonly chain: NamedGateway[],
        /** Overall budget in ms; defaults to the per-job timeout. Injectable for tests. */
        private readonly deadlineMs?: number,
    ) {
        if (chain.length === 0) {
            throw new Error('FallbackGateway needs at least one provider.');
        }
    }

    private warnOnce(key: string, message: string): void {
        if (this.warned.has(key)) return;
        this.warned.add(key);
        console.warn(message);
    }

    async complete(req: CompleteRequest): Promise<CompleteReply> {
        const budget = AbortSignal.timeout(this.deadlineMs ?? timeoutFor(req.job));
        const signal = req.signal ? AbortSignal.any([req.signal, budget]) : budget;
        const attempt: CompleteRequest = { ...req, signal };

        const failures: string[] = [];

        // Never disable the last provider standing — a bad chain should surface
        // its real error, not an empty-chain one.
        const usable = this.chain.filter((gw) => !this.disabled.has(gw.name));
        const chain = usable.length ? usable : this.chain;

        for (let i = 0; i < chain.length; i++) {
            const gw = chain[i];
            try {
                const reply = await gw.complete(attempt);
                if (failures.length) {
                    this.warnOnce(
                        `served:${gw.name}:${failures[0]}`,
                        `[gateway] ${gw.name} served after fallback — ${failures.join(' | ')}`,
                    );
                }
                return reply;
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                failures.push(`${gw.name}: ${message}`);

                // A wrong key or an unfunded account is a config mistake, not an
                // outage — say so once, and name the thing to go and fix.
                if (err instanceof GatewayError) {
                    if (err.code === 'unauthorized' || err.code === 'forbidden') {
                        this.warnOnce(
                            `key:${gw.name}`,
                            `[gateway] ${gw.name} rejected the API key — check ${gw.name.toUpperCase()}_API_KEY.`,
                        );
                    } else if (err.code === 'payment_required' || err.code === 'spend_capped') {
                        this.warnOnce(
                            `billing:${gw.name}`,
                            `[gateway] ${gw.name} has no quota left — check billing for ${gw.name}.`,
                        );
                    }
                    if (TERMINAL.has(err.code) && chain.length > 1) {
                        this.disabled.add(gw.name);
                    }
                }

                if (!shouldAdvance(err)) throw err;

                const next = chain[i + 1];
                if (next) {
                    this.warnOnce(
                        `fallback:${gw.name}:${next.name}:${err instanceof GatewayError ? err.code : 'error'}`,
                        `[gateway] ${gw.name} failed (${message}); falling back to ${next.name}`,
                    );
                }
            }
        }

        throw new GatewayError(
            'generation_failed',
            `all AI providers failed — ${failures.join(' | ')}`,
            false,
            // `chainExhausted` marks this as an availability failure, not a bad
            // reply. The repair path must not retry it: every provider has already
            // been tried, so another attempt only spends quota that is not there.
            { failures, chainExhausted: true },
        );
    }
}
