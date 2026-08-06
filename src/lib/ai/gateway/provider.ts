import { GoogleGenAI, type Schema } from '@google/genai';
import { aiConfig } from '../config';
import { modelFor, timeoutFor, type Job, type Tier } from './tiers';

export interface CompleteRequest {
    tier: Tier;
    job: Job;
    system?: string;
    user: string;
    schema?: Schema;
}

export interface CompleteReply {
    text: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
}

export class GeminiGateway {
    private client: GoogleGenAI | null = null;

    private sdk(): GoogleGenAI {
        return (this.client ??= new GoogleGenAI({ apiKey: aiConfig().apiKey }));
    }

    async complete(req: CompleteRequest): Promise<CompleteReply> {
        const model = modelFor(req.tier);
        const startedAt = Date.now();

        const response = await this.sdk().models.generateContent({
            model,
            contents: req.user,
            config: {
                ...(req.system ? { systemInstruction: req.system } : {}),
                ...(req.schema
                    ? { responseMimeType: 'application/json', responseSchema: req.schema }
                    : {}),
                abortSignal: AbortSignal.timeout(timeoutFor(req.job)),
            },
        });

        const usage = response.usageMetadata;

        return {
            text: response.text ?? '',
            model,
            inputTokens: usage?.promptTokenCount ?? 0,
            outputTokens: usage?.candidatesTokenCount ?? 0,
            latencyMs: Date.now() - startedAt,
        };
    }
}