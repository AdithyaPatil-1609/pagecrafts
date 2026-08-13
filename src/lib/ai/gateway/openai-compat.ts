import type { ErrorCode } from '@/lib/contracts';
import type { Provider, ProviderConfig } from '../config';
import { maxOutputFor, samplingFor, type Tier } from './tiers';
import { toJsonSchema } from './json-schema';
import { limiterFor } from './rate-limit';
import {
    GatewayError,
    attemptSignal,
    type CompleteReply,
    type CompleteRequest,
    type NamedGateway,
} from './provider';

interface ChatCompletionResponse {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string; type?: string; code?: string };
}

/** `provider:model` pairs found not to support json_schema, so we ask only once. */
const schemaSupport = new Set<string>();

/** Longest Retry-After we will wait out rather than advancing the chain. */
const MAX_RETRY_AFTER_MS = 30_000;

/** Seconds or an HTTP date. Returns -1 when absent; `0` means retry immediately. */
export function retryAfterMs(header: string | null): number {
    if (!header) return -1;
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const at = Date.parse(header);
    return Number.isNaN(at) ? -1 : Math.max(0, at - Date.now());
}

/** ~4 chars per token. */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/** Any OpenAI-compatible chat-completions endpoint (Groq, Cerebras, …). */
export class OpenAICompatGateway implements NamedGateway {
    constructor(
        readonly name: Provider,
        private readonly cfg: ProviderConfig,
    ) {}

    get configured(): boolean {
        return this.cfg.apiKey.length > 0;
    }

    private modelFor(tier: Tier): string {
        return tier === 'fast' ? this.cfg.models.fast : this.cfg.models.strong;
    }

    async complete(req: CompleteRequest): Promise<CompleteReply> {
        if (!this.configured) {
            throw new GatewayError('internal', `${this.name}: no API key configured`, false);
        }

        const model = this.modelFor(req.tier);
        const startedAt = Date.now();

        const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
        if (req.system) messages.push({ role: 'system', content: req.system });
        messages.push({ role: 'user', content: req.user });

        // AC-F10-5: reject before dispatch, not after.
        const estimatedInput = estimateTokens((req.system ?? '') + req.user);
        const ceiling = this.cfg.quota.maxRequestTokens;
        if (estimatedInput > ceiling) {
            throw new GatewayError(
                'validation_failed',
                `${this.name}: input ~${estimatedInput} tokens exceeds the ${ceiling}-token ceiling`,
                false,
            );
        }

        const { temperature, topP } = samplingFor(req.job);

        const body: Record<string, unknown> = {
            model,
            messages,
            max_tokens: maxOutputFor(req.job),
            // Omitted entirely when unconfigured, so the provider default stands.
            ...(temperature === undefined ? {} : { temperature }),
            ...(topP === undefined ? {} : { top_p: topP }),
        };

        if (req.schema) {
            // Strict json_schema enforces enums provider-side; not every model
            // supports it, so a rejection degrades to json_object below.
            body.response_format = schemaSupport.has(`${this.name}:${model}`)
                ? { type: 'json_object' }
                : {
                    type: 'json_schema',
                    json_schema: { name: 'reply', strict: true, schema: toJsonSchema(req.schema) },
                };
            const mentionsJson = /json/i.test(req.system ?? '') || /json/i.test(req.user);
            if (!mentionsJson) {
                messages[messages.length - 1].content += '\n\nRespond with a single JSON object.';
            }
        }

        const send = async (): Promise<Response> => {
            try {
                return await fetch(`${this.cfg.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        authorization: `Bearer ${this.cfg.apiKey}`,
                    },
                    body: JSON.stringify(body),
                    signal: attemptSignal(req.job, req.signal),
                });
            } catch (err) {
                const timedOut =
                    err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
                throw new GatewayError(
                    'generation_failed',
                    `${this.name}: ${timedOut ? 'request timed out' : 'network error'}`,
                    true,
                    err,
                );
            }
        };

        // Pacing and Retry-After waits are client-side, so they are excluded from
        // latencyMs — NFR-003 is measured on provider time, not on our own waiting.
        let waitedMs = 0;
        const limiter = limiterFor(this.name, this.cfg.quota);
        waitedMs += await limiter.acquire(estimatedInput);

        let res = await send();

        if (res.status === 400 && body.response_format) {
            const why = await res.clone().text().catch(() => '');
            if (/response.?format|json_schema/i.test(why)) {
                schemaSupport.add(`${this.name}:${model}`);
                console.warn(
                    `[gateway] ${this.name}/${model} does not support json_schema — ` +
                        'falling back to json_object; enums are no longer provider-enforced.',
                );
                body.response_format = { type: 'json_object' };
                res = await send();
            }
        }

        // Advancing on a transient 429 would spend a scarcer provider's quota.
        if (res.status === 429) {
            const waitMs = retryAfterMs(res.headers.get('retry-after'));
            if (waitMs >= 0 && waitMs <= MAX_RETRY_AFTER_MS) {
                console.warn(`[gateway] ${this.name} rate-limited; waiting ${Math.round(waitMs / 1000)}s before retrying.`);
                if (waitMs > 0) {
                    await new Promise((r) => setTimeout(r, waitMs));
                    waitedMs += waitMs;
                }
                res = await send();
            }
        }

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            const retryable = res.status === 429 || res.status >= 500;
            const byStatus: Record<number, ErrorCode> = {
                401: 'unauthorized',
                403: 'forbidden',
                402: 'payment_required',
                404: 'not_found',
                429: 'rate_limited',
            };
            const code: ErrorCode = byStatus[res.status] ?? 'generation_failed';
            throw new GatewayError(
                code,
                `${this.name}: HTTP ${res.status}`,
                retryable,
                detail,
            );
        }

        const data = (await res.json()) as ChatCompletionResponse;
        const text = data.choices?.[0]?.message?.content ?? '';
        limiter.record(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0);

        const mode = body.response_format as { type?: string } | undefined;

        return {
            provider: this.name,
            structuredOutput: (mode?.type as CompleteReply['structuredOutput']) ?? 'none',
            text,
            model,
            inputTokens: data.usage?.prompt_tokens ?? 0,
            outputTokens: data.usage?.completion_tokens ?? 0,
            latencyMs: Math.max(0, Date.now() - startedAt - waitedMs),
        };
    }
}
