import { z } from 'zod';

export type AiOperation = 'classify' | 'generate' | 'edit';

const envSchema = z.object({
    GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is missing from .env.local'),
    GEMINI_MODEL_FAST: z.string().default('gemini-2.5-flash-lite'),
    GEMINI_MODEL_STRONG: z.string().default('gemini-2.5-flash'),
    GEMINI_RPM: z.coerce.number().int().positive().default(5),
    GEMINI_RPD: z.coerce.number().int().positive().default(20),
    GEMINI_MAX_REQUEST_TOKENS: z.coerce.number().int().positive().default(8000),
    GEMINI_TIMEOUT_CLASSIFY_MS: z.coerce.number().int().positive().default(5_000),
    GEMINI_TIMEOUT_GENERATE_MS: z.coerce.number().int().positive().default(45_000),
    GEMINI_TIMEOUT_EDIT_MS: z.coerce.number().int().positive().default(30_000),
});

export interface AiConfig {
    apiKey: string;
    models: { fast: string; strong: string };
    quota: { rpm: number; rpd: number; maxRequestTokens: number };
    timeouts: Record<AiOperation, number>;
}

export function loadAiConfig(env: Record<string, string | undefined> = process.env,): AiConfig {
    const parsed = envSchema.safeParse(env);

    if (!parsed.success) {
        const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
        throw new Error(`AI configuration is not usable:\n${lines.join('\n')}`);
    }

    const v = parsed.data;

    return {
        apiKey: v.GEMINI_API_KEY,
        models: { fast: v.GEMINI_MODEL_FAST, strong: v.GEMINI_MODEL_STRONG },
        quota: {
            rpm: v.GEMINI_RPM,
            rpd: v.GEMINI_RPD,
            maxRequestTokens: v.GEMINI_MAX_REQUEST_TOKENS,
        },
        timeouts: {
            classify: v.GEMINI_TIMEOUT_CLASSIFY_MS,
            generate: v.GEMINI_TIMEOUT_GENERATE_MS,
            edit: v.GEMINI_TIMEOUT_EDIT_MS,
        },
    };
}

let cached: AiConfig | null = null;

export function aiConfig(): AiConfig {
    return (cached ??= loadAiConfig());
}