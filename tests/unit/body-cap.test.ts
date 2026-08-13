import { describe, it, expect } from 'vitest';
import { readJson, MAX_BODY_BYTES } from '@/lib/kernel/body';
import { ApiError } from '@/lib/errors/respond';

function request(body: string, declared?: number): Request {
    return new Request('http://x/api/v1/auth/signup', {
        method: 'POST',
        body,
        headers: {
            'content-type': 'application/json',
            'content-length': String(declared ?? body.length),
        },
    });
}

describe('readJson', () => {
    it('reads a normal body', async () => {
        await expect(readJson(request('{"email":"a@b.co"}'))).resolves.toEqual({ email: 'a@b.co' });
    });

    it('returns null for a body that is not JSON, so callers decide the message', async () => {
        await expect(readJson(request('not json'))).resolves.toBeNull();
    });

    it('returns null for an empty body', async () => {
        await expect(readJson(request(''))).resolves.toBeNull();
    });

    it('refuses a body whose declared length is over the cap, without reading it', async () => {
        const promise = readJson(request('{}', MAX_BODY_BYTES + 1));

        await expect(promise).rejects.toBeInstanceOf(ApiError);
        await expect(promise).rejects.toMatchObject({ code: 'payload_too_large' });
    });

    it('refuses a body that lies about its length and is oversized on the wire', async () => {
        const huge = `{"a":"${'x'.repeat(MAX_BODY_BYTES)}"}`;

        await expect(readJson(request(huge, 10))).rejects.toMatchObject({
            code: 'payload_too_large',
        });
    });

    it('accepts a body exactly at the cap', async () => {
        const padding = MAX_BODY_BYTES - '{"a":""}'.length;
        const exact = `{"a":"${'x'.repeat(padding)}"}`;

        expect(exact.length).toBeLessThanOrEqual(MAX_BODY_BYTES);
        await expect(readJson(request(exact))).resolves.toMatchObject({ a: 'x'.repeat(padding) });
    });
});
