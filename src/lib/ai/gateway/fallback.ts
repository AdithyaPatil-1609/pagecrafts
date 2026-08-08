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
 * rate-limited, unreachable, or misconfigured (a wrong key — try the others so
 * the user is still served). It stops immediately on a request-shape fault
 * (`validation_failed`, a non-retryable 4xx), because that fault will reproduce
 * identically at every provider — advancing would burn the whole chain to learn
 * nothing. Downstream Zod validation throws *outside* the gateway, so it never
 * reaches here: quality failures were never the chain's job.
 */
function shouldAdvance(err: unknown): boolean {
    if (err instanceof GatewayError) {
        if (err.code === 'validation_failed') return false;
        return err.retryable || err.code === 'rate_limited' || err.code === 'unauthorized';
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
    constructor(
        private readonly chain: NamedGateway[],
        /** Overall budget in ms; defaults to the per-job timeout. Injectable for tests. */
        private readonly deadlineMs?: number,
    ) {
        if (chain.length === 0) {
            throw new Error('FallbackGateway needs at least one provider.');
        }
    }

    async complete(req: CompleteRequest): Promise<CompleteReply> {
        const budget = AbortSignal.timeout(this.deadlineMs ?? timeoutFor(req.job));
        const signal = req.signal ? AbortSignal.any([req.signal, budget]) : budget;
        const attempt: CompleteRequest = { ...req, signal };

        const failures: string[] = [];

        for (let i = 0; i < this.chain.length; i++) {
            const gw = this.chain[i];
            try {
                const reply = await gw.complete(attempt);
                if (failures.length) {
                    console.warn(`[gateway] ${gw.name} served after fallback — ${failures.join(' | ')}`);
                }
                return reply;
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                failures.push(`${gw.name}: ${message}`);

                // A wrong key is a config mistake, not an outage — say so loudly, once.
                if (err instanceof GatewayError && err.code === 'unauthorized') {
                    console.warn(`[gateway] ${gw.name} rejected the API key — check ${gw.name.toUpperCase()}_API_KEY.`);
                }

                if (!shouldAdvance(err)) throw err;

                const next = this.chain[i + 1];
                if (next) {
                    console.warn(`[gateway] ${gw.name} failed (${message}); falling back to ${next.name}`);
                }
            }
        }

        throw new GatewayError(
            'generation_failed',
            `all AI providers failed — ${failures.join(' | ')}`,
            false,
            { failures },
        );
    }
}
