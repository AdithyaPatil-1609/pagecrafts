import { GoogleGenAI } from '@google/genai';
import { aiConfig, type AiConfig } from '../config';
import type { LLMProvider, FillContext } from '../LLMProvider';
import type {
    IntentAttributes, VerticalProfile, SectionInstance, SectionProps, EditProposal, AiResult,
} from '@/lib/contracts';


export type Tier = 'fast' | 'strong';

export interface RawRequest {
    tier: Tier;
    system?: string;
    user: string;
}

export interface RawReply {
    text: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
}

const NOT_YET = (what: string) => new Error(`${what}() lands later on D2.`);

export class GeminiProvider implements LLMProvider {
    private readonly client: GoogleGenAI;
    private readonly cfg: AiConfig;

    constructor(cfg: AiConfig = aiConfig()) {
        this.cfg = cfg;
        this.client = new GoogleGenAI({ apiKey: cfg.apiKey });
    }

    modelFor(tier: Tier): string {
        return tier === 'fast' ? this.cfg.models.fast : this.cfg.models.strong;
    }

    async raw({ tier, system, user }: RawRequest): Promise<RawReply> {
        const model = this.modelFor(tier);
        const startedAt = Date.now();

        const response = await this.client.models.generateContent({
            model,
            contents: user,
            config: {
                ...(system ? { systemInstruction: system } : {}),
                abortSignal: AbortSignal.timeout(this.cfg.timeoutMs),
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

    async classify(_text: string): Promise<AiResult<IntentAttributes>> {
        throw NOT_YET('classify');
    }

    async profile(_vertical: string): Promise<AiResult<VerticalProfile>> {
        throw NOT_YET('profile');
    }

    async plan(
        _prompt: string,
        _intent: IntentAttributes,
        _profile: VerticalProfile,
    ): Promise<AiResult<SectionInstance[]>> {
        throw NOT_YET('plan');
    }

    async fillSection(
        _instance: SectionInstance,
        _context: FillContext,
    ): Promise<AiResult<SectionProps>> {
        throw NOT_YET('fillSection');
    }

    async edit(
        _section: SectionInstance,
        _instruction: string,
    ): Promise<AiResult<EditProposal>> {
        throw NOT_YET('edit');
    }
}