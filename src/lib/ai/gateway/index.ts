import type { Schema } from '@google/genai';

import { GeminiGateway, type CompleteReply, type CompleteRequest } from './provider';
import { MockGateway } from './mock';
import type { Job, Tier } from './tiers';

export type { CompleteReply, CompleteRequest, Job, Tier };

export interface Gateway {
    complete(req: CompleteRequest): Promise<CompleteReply>;
}

let instance: Gateway | null = null;

function shouldMock(): boolean {
    if (process.env.LLM_MOCK !== '1') return false;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('LLM_MOCK is set in production. Refusing to serve fixture content.');
    }
    return true;
}

export function gateway(): Gateway {
    if (instance) return instance;
    instance = shouldMock() ? new MockGateway() : new GeminiGateway();
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