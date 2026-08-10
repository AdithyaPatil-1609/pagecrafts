import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAICompatGateway, retryAfterMs } from '@/lib/ai/gateway/openai-compat';
import type { ProviderConfig } from '@/lib/ai/config';
import type { CompleteRequest } from '@/lib/ai/gateway/provider';
import { classifySchema } from '@/lib/ai/gateway/response-schemas';

function cfg(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
    return {
        apiKey: 'k',
        models: { fast: 'fast-model', strong: 'strong-model' },
        baseUrl: 'https://api.example.test/v1',
        quota: { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000, rpdHeadroomPct: 15, maxRequestTokens: 8000 },
        pricing: { inPerMTokCents: 0, outPerMTokCents: 0 },
        ...overrides,
    };
}

const okBody = {
    choices: [{ message: { content: '{}' } }],
    usage: { prompt_tokens: 3, completion_tokens: 4 },
};

function okFetch() {
    return vi.fn(async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify(okBody), { status: 200 }));
}

function bodyOf(fetchMock: ReturnType<typeof okFetch>): Record<string, unknown> {
    return JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
}

const req = (over: Partial<CompleteRequest> = {}): CompleteRequest => ({
    tier: 'strong', job: 'generate', user: 'hello', ...over,
});

afterEach(() => vi.restoreAllMocks());

describe('OpenAICompatGateway', () => {
    it('D5: labels the reply with its provider and model', async () => {
        vi.stubGlobal('fetch', okFetch());
        const reply = await new OpenAICompatGateway('groq', cfg()).complete(req());
        expect(reply.provider).toBe('groq');
        expect(reply.model).toBe('strong-model');
    });

    it('D3: sends max_tokens in the request body', async () => {
        const fetchMock = okFetch();
        vi.stubGlobal('fetch', fetchMock);
        await new OpenAICompatGateway('groq', cfg()).complete(req());
        expect(bodyOf(fetchMock).max_tokens).toBeGreaterThan(0);
    });

    it('D3: rejects oversized input before dispatch', async () => {
        const fetchMock = okFetch();
        vi.stubGlobal('fetch', fetchMock);
        const gw = new OpenAICompatGateway('groq', cfg({
            quota: { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000, rpdHeadroomPct: 15, maxRequestTokens: 5 },
        }));
        await expect(gw.complete(req({ user: 'x'.repeat(1000) })))
            .rejects.toMatchObject({ code: 'validation_failed' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('D9 / C5: never merges system into user', async () => {
        const fetchMock = okFetch();
        vi.stubGlobal('fetch', fetchMock);
        await new OpenAICompatGateway('groq', cfg()).complete(req({ system: 'SYS', user: 'USR' }));
        expect(bodyOf(fetchMock).messages).toEqual([
            { role: 'system', content: 'SYS' },
            { role: 'user', content: 'USR' },
        ]);
    });

    it('B1b: sends strict json_schema, not json_object, when a schema is given', async () => {
        const fetchMock = okFetch();
        vi.stubGlobal('fetch', fetchMock);
        await new OpenAICompatGateway('groq', cfg()).complete(req({ schema: classifySchema }));

        const rf = bodyOf(fetchMock).response_format as {
            type: string;
            json_schema: { strict: boolean; schema: { properties: Record<string, { enum?: string[] }> } };
        };
        expect(rf.type).toBe('json_schema');
        expect(rf.json_schema.strict).toBe(true);
        expect(rf.json_schema.schema.properties.tone.enum).toContain('minimal');
    });

    it('sends no response_format when the caller gives no schema', async () => {
        const fetchMock = okFetch();
        vi.stubGlobal('fetch', fetchMock);
        await new OpenAICompatGateway('groq', cfg()).complete(req());
        expect(bodyOf(fetchMock)).not.toHaveProperty('response_format');
    });

    it('falls back to json_object when the model rejects json_schema', async () => {
        const unsupported = new Response(
            JSON.stringify({ error: { message: 'This model does not support response format `json_schema`.' } }),
            { status: 400 },
        );
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(unsupported)
            .mockResolvedValueOnce(new Response(JSON.stringify(okBody), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const models = { fast: 'legacy-fast', strong: 'legacy-strong' };
        const reply = await new OpenAICompatGateway('groq', cfg({ models }))
            .complete(req({ schema: classifySchema }));

        expect(reply.provider).toBe('groq');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const second = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
        expect(second.response_format).toEqual({ type: 'json_object' });
    });

    // The clock is frozen for the date case. retryAfterMs reads Date.now() itself, so the
    // header is built from one reading and compared against a later one; an HTTP date also
    // truncates to whole seconds, spending up to 999ms of the gap before the test starts.
    // That left about a second of slack, and a loaded machine ate it — this failed at
    // 1816ms on a box that was installing updates mid-run.
    it('parses Retry-After as seconds or an HTTP date', () => {
        expect(retryAfterMs('2')).toBe(2000);
        expect(retryAfterMs('0')).toBe(0);
        expect(retryAfterMs(null)).toBe(-1);
        expect(retryAfterMs('nonsense')).toBe(-1);

        vi.useFakeTimers();
        try {
            expect(retryAfterMs(new Date(Date.now() + 5000).toUTCString())).toBeGreaterThan(3000);
        } finally {
            vi.useRealTimers();
        }
    });

    // A 429 is transient; advancing would spend a scarcer provider's quota on it.
    it('waits out a short Retry-After and retries the same provider', async () => {
        const limited = new Response('slow down', {
            status: 429, headers: { 'retry-after': '0' },
        });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(limited)
            .mockResolvedValueOnce(new Response(JSON.stringify(okBody), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const reply = await new OpenAICompatGateway('groq', cfg({
            models: { fast: 'retry-fast', strong: 'retry-strong' },
        })).complete(req());

        expect(reply.provider).toBe('groq');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('maps HTTP 429 to a retryable rate_limited error', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('slow down', { status: 429 })));
        await expect(new OpenAICompatGateway('groq', cfg()).complete(req()))
            .rejects.toMatchObject({ code: 'rate_limited', retryable: true });
    });

    it('maps HTTP 401 to a non-retryable unauthorized error', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
        await expect(new OpenAICompatGateway('groq', cfg()).complete(req()))
            .rejects.toMatchObject({ code: 'unauthorized', retryable: false });
    });

    it('throws (no dispatch) when the provider has no key', async () => {
        const fetchMock = okFetch();
        vi.stubGlobal('fetch', fetchMock);
        await expect(new OpenAICompatGateway('groq', cfg({ apiKey: '' })).complete(req()))
            .rejects.toThrow(/no API key/);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
