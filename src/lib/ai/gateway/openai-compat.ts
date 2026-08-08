import type { ErrorCode } from '@/lib/contracts';
import type { Provider, ProviderConfig } from '../config';
import { maxOutputFor, type Tier } from './tiers';
import { toJsonSchema } from './json-schema';
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

/** Rough token estimate for pre-dispatch ceiling checks (~4 chars per token). */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * A gateway for any OpenAI-compatible chat-completions endpoint (Groq, Cerebras, …).
 *
 * We talk to `${baseUrl}/chat/completions` over `fetch` rather than pulling in a
 * per-vendor SDK: the wire format is identical, so one client covers them all.
 * Structured output uses `json_object` mode (universally supported) and leans on
 * the downstream Zod validation + repair for shape — see generate/plan.ts and the
 * `.catch()` safety nets in contracts/schemas/ai.ts.
 */
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

        // AC-F10-5: reject an over-budget request before dispatch, not after. A
        // non-retryable validation error stops the chain — an oversized prompt
        // fails identically at every provider.
        const estimatedInput = estimateTokens((req.system ?? '') + req.user);
        const ceiling = this.cfg.quota.maxRequestTokens;
        if (estimatedInput > ceiling) {
            throw new GatewayError(
                'validation_failed',
                `${this.name}: input ~${estimatedInput} tokens exceeds the ${ceiling}-token ceiling`,
                false,
            );
        }

        const body: Record<string, unknown> = {
            model,
            messages,
            max_tokens: maxOutputFor(req.job),
        };

        if (req.schema) {
            // Strict json_schema restores the provider-side enum guarantee that
            // Gemini's responseSchema gave us; Zod stays as the safety net. Not
            // every hosted model supports it, so `send` degrades to json_object.
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
                // Network failure or timeout — treat as "provider unavailable" so the
                // fallback chain advances to the next provider.
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

        return {
            provider: this.name,
            text,
            model,
            inputTokens: data.usage?.prompt_tokens ?? 0,
            outputTokens: data.usage?.completion_tokens ?? 0,
            latencyMs: Date.now() - startedAt,
        };
    }
}
