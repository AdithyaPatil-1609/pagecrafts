import { z } from 'zod';

export type AiOperation = 'classify' | 'generate' | 'edit';

const envSchema = z.object({
    AI_PROVIDER: z.enum(['gemini']).default('gemini'),
    GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is missing from .env.local'),
    GEMINI_MODEL_FAST: z.string().default('gemini-2.5-flash-lite'),
    GEMINI_MODEL_STRONG: z.string().default('gemini-2.5-flash'),
    GEMINI_RPM: z.coerce.number().int().positive().default(5),
    GEMINI_RPD: z.coerce.number().int().positive().default(20),
    GEMINI_RPD_HEADROOM_PCT: z.coerce.number().min(0).max(100).default(15),
    GEMINI_MAX_REQUEST_TOKENS: z.coerce.number().int().positive().default(8000),
    GEMINI_TIMEOUT_CLASSIFY_MS: z.coerce.number().int().positive().default(5_000),
    GEMINI_TIMEOUT_GENERATE_MS: z.coerce.number().int().positive().default(45_000),
    GEMINI_TIMEOUT_EDIT_MS: z.coerce.number().int().positive().default(30_000),
    GEMINI_PRICE_IN_PER_MTOK_CENTS: z.coerce.number().min(0).default(0),
    GEMINI_PRICE_OUT_PER_MTOK_CENTS: z.coerce.number().min(0).default(0),
});

export interface AiConfig {
    provider: 'gemini';
    apiKey: string;
    models: { fast: string; strong: string };
    quota: { rpm: number; rpd: number; rpdHeadroomPct: number; maxRequestTokens: number };
    timeouts: Record<AiOperation, number>;
    pricing: { inPerMTokCents: number; outPerMTokCents: number };
}

export function loadAiConfig(env: Record<string, string | undefined> = process.env,): AiConfig {
    const parsed = envSchema.safeParse(env);

    if (!parsed.success) {
        const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
        throw new Error(`AI configuration is not usable:\n${lines.join('\n')}`);
    }

    const v = parsed.data;

    return {
        provider: v.AI_PROVIDER,
        apiKey: v.GEMINI_API_KEY,
        models: { fast: v.GEMINI_MODEL_FAST, strong: v.GEMINI_MODEL_STRONG },
        quota: {
            rpm: v.GEMINI_RPM,
            rpd: v.GEMINI_RPD,
            rpdHeadroomPct: v.GEMINI_RPD_HEADROOM_PCT,
            maxRequestTokens: v.GEMINI_MAX_REQUEST_TOKENS,
        },
        timeouts: {
            classify: v.GEMINI_TIMEOUT_CLASSIFY_MS,
            generate: v.GEMINI_TIMEOUT_GENERATE_MS,
            edit: v.GEMINI_TIMEOUT_EDIT_MS,
        },
        pricing: {
            inPerMTokCents: v.GEMINI_PRICE_IN_PER_MTOK_CENTS,
            outPerMTokCents: v.GEMINI_PRICE_OUT_PER_MTOK_CENTS,
        },
    };
}

let cached: AiConfig | null = null;

export function aiConfig(): AiConfig {
    return (cached ??= loadAiConfig());
}