import { GoogleGenAI, type Schema } from '@google/genai';
import { aiConfig, type Provider, type ProviderConfig } from '../config';
import type { ErrorCode } from '@/lib/contracts';
import { timeoutFor, type Job, type Tier } from './tiers';

export interface CompleteRequest {
    tier: Tier;
    job: Job;
    system?: string;
    user: string;
    schema?: Schema;
    /** An external deadline from the fallback chain; combined with the per-attempt timeout. */
    signal?: AbortSignal;
}

export interface CompleteReply {
    /** The provider that served this reply. */
    provider: Provider;
    text: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
}

export class GatewayError extends Error {
    constructor(
        readonly code: ErrorCode,
        message: string,
        readonly retryable = false,
        readonly detail?: unknown,
    ) {
        super(message);
    }
}

export interface Gateway {
    complete(req: CompleteRequest): Promise<CompleteReply>;
}

/** A gateway that reports its provider name and whether it has credentials to run. */
export interface NamedGateway extends Gateway {
    readonly name: Provider;
    /** False when the provider has no API key configured, so the chain can skip it. */
    readonly configured: boolean;
}

/**
 * Combine the caller's deadline (if any) with this attempt's own timeout, so a
 * single request never runs longer than the fallback chain's overall budget.
 */
export function attemptSignal(job: Job, external?: AbortSignal): AbortSignal {
    const own = AbortSignal.timeout(timeoutFor(job));
    return external ? AbortSignal.any([external, own]) : own;
}

export class GeminiGateway implements NamedGateway {
    readonly name = 'gemini';
    private client: GoogleGenAI | null = null;

    constructor(private readonly cfg: ProviderConfig = aiConfig().providers.gemini) {}

    get configured(): boolean {
        return this.cfg.apiKey.length > 0;
    }

    private sdk(): GoogleGenAI {
        return (this.client ??= new GoogleGenAI({ apiKey: this.cfg.apiKey }));
    }

    private modelFor(tier: Tier): string {
        return tier === 'fast' ? this.cfg.models.fast : this.cfg.models.strong;
    }

    async complete(req: CompleteRequest): Promise<CompleteReply> {
        const model = this.modelFor(req.tier);
        const startedAt = Date.now();

        const response = await this.sdk().models.generateContent({
            model,
            contents: req.user,
            config: {
                ...(req.system ? { systemInstruction: req.system } : {}),
                ...(req.schema
                    ? { responseMimeType: 'application/json', responseSchema: req.schema }
                    : {}),
                abortSignal: attemptSignal(req.job, req.signal),
            },
        });

        const usage = response.usageMetadata;

        return {
            provider: this.name,
            text: response.text ?? '',
            model,
            inputTokens: usage?.promptTokenCount ?? 0,
            outputTokens: usage?.candidatesTokenCount ?? 0,
            latencyMs: Date.now() - startedAt,
        };
    }
}
