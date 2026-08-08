import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAICompatGateway } from '@/lib/ai/gateway/openai-compat';
import type { ProviderConfig } from '@/lib/ai/config';
import type { CompleteRequest } from '@/lib/ai/gateway/provider';

function cfg(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
    return {
        apiKey: 'k',
        models: { fast: 'fast-model', strong: 'strong-model' },
        baseUrl: 'https://api.example.test/v1',
        quota: { rpm: 30, rpd: 1000, rpdHeadroomPct: 15, maxRequestTokens: 8000 },
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
            quota: { rpm: 30, rpd: 1000, rpdHeadroomPct: 15, maxRequestTokens: 5 },
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
