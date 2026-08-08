import type { Schema } from '@google/genai';

import {
    GeminiGateway,
    GatewayError,
    type Gateway,
    type NamedGateway,
    type CompleteReply,
    type CompleteRequest,
} from './provider';
import { OpenAICompatGateway } from './openai-compat';
import { FallbackGateway } from './fallback';
import { MockGateway } from './mock';
import { aiConfig, type AiConfig, type Provider } from '../config';
import type { Job, Tier } from './tiers';

export { GatewayError };
export type { Gateway, CompleteReply, CompleteRequest, Job, Tier };

let instance: Gateway | null = null;

function shouldMock(): boolean {
    if (process.env.LLM_MOCK !== '1') return false;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('LLM_MOCK is set in production. Refusing to serve fixture content.');
    }
    return true;
}

/** The configured priority chain, minus any provider with no API key. Pure — takes its config. */
export function chainFor(cfg: AiConfig): NamedGateway[] {
    const make: Record<Provider, () => NamedGateway> = {
        gemini: () => new GeminiGateway(cfg.providers.gemini),
        groq: () => new OpenAICompatGateway('groq', cfg.providers.groq),
        cerebras: () => new OpenAICompatGateway('cerebras', cfg.providers.cerebras),
    };
    return cfg.order.map((p) => make[p]()).filter((gw) => gw.configured);
}

/** Build the live gateway from a config: the priority chain, or a single provider unwrapped. */
export function buildGateway(cfg: AiConfig = aiConfig()): Gateway {
    const chain = chainFor(cfg);

    if (chain.length === 0) {
        throw new Error(
            'No AI provider is configured. Set at least one of GROQ_API_KEY, ' +
                'CEREBRAS_API_KEY, or GEMINI_API_KEY.',
        );
    }

    return chain.length === 1 ? chain[0] : new FallbackGateway(chain);
}

export function gateway(): Gateway {
    if (instance) return instance;
    instance = shouldMock() ? new MockGateway() : buildGateway();
    return instance;
}

export function setGateway(next: Gateway | null): void {
    instance = next;
}

export interface CallOptions {
    job: Job;
    system?: string;
    user: string;
    schema?: Schema;
}

const call = (tier: Tier) => (options: CallOptions): Promise<CompleteReply> =>
    gateway().complete({ tier, ...options });

export const model = {
    fast: { complete: call('fast') },
    strong: { complete: call('strong') },
};
