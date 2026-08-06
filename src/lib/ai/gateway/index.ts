import { GeminiGateway, type CompleteReply, type CompleteRequest } from './provider';
import type { Job, Tier } from './tiers';
import type { Schema } from '@google/genai';

export type { CompleteReply, CompleteRequest };

export interface Gateway {
    complete(req: CompleteRequest): Promise<CompleteReply>;
}

let instance: Gateway | null = null;

export function gateway(): Gateway {
    return (instance ??= new GeminiGateway());
}

export function setGateway(next: Gateway | null): void {
    instance = next;
}

interface CallOptions {
    job: Job;
    system?: string;
    user: string;
    schema?: Schema;
}

const call = (tier: Tier) => (o: CallOptions): Promise<CompleteReply> =>
    gateway().complete({ tier, ...o });

export const model = {
    fast: { complete: call('fast') },
    strong: { complete: call('strong') },
};