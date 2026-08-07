import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { ApiError } from '@/lib/errors/respond';

const auth = vi.hoisted(() => ({
    requireUser: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
    requireUser: auth.requireUser,
    supabaseRoute: async () => ({}),
}));

import { setGateway } from '@/lib/ai/gateway';
import { MockGateway } from '@/lib/ai/gateway/mock';
import { POST } from '@/app/api/v1/intent/classify/route';

const post = (body: unknown) =>
    POST(new Request('http://x/api/v1/intent/classify', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    }) as never);

beforeEach(() => {
    auth.requireUser.mockResolvedValue({ userId: 'u_1', supabase: {} });
});

afterEach(() => {
    setGateway(null);
    vi.clearAllMocks();
});

describe('POST /api/v1/intent/classify', () => {
    it('returns the documented shape on the happy path', async () => {
        setGateway(new MockGateway());
        const res = await post({ text: 'a dark site for a photography studio' });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.data).toMatchObject({
            category: expect.any(String),
            vertical: expect.any(String),
            tone: expect.any(String),
            palette: expect.any(String),
            sections: expect.any(Array),
            fallback: false,
        });
    });

    it('degrades to other on provider failure, still 200', async () => {
        setGateway(new MockGateway('error'));
        const res = await post({ text: 'anything at all' });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data.category).toBe('other');
        expect(json.data.fallback).toBe(true);
    });

    it('rejects text over 500 characters', async () => {
        const res = await post({ text: 'x'.repeat(501) });
        const json = await res.json();

        expect(res.status).toBe(422);
        expect(json.ok).toBe(false);
        expect(json.error.code).toBe('validation_failed');
    });

    it('rejects unauthenticated requests before any model call', async () => {
        let called = false;
        setGateway({
            async complete() {
                called = true;
                throw new Error('should not be called');
            },
        });

        auth.requireUser.mockRejectedValue(new ApiError('unauthorized', 'Please sign in.'));

        const res = await post({ text: 'hi' });

        expect(res.status).toBe(401);
        expect(called).toBe(false);
    });
});