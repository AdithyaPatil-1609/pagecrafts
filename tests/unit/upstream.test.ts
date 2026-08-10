import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { codeFor, messageFor, upstreamFailure, type Upstream } from '@/lib/errors/upstream';
import { ERROR_STATUS, statusFor } from '@/lib/errors/codes';
import { ApiError } from '@/lib/errors/respond';

const SOURCES: Upstream[] = ['ai', 'hosting', 'database', 'cache'];

describe('upstream failure mapping', () => {
    it('never maps an upstream failure to a bare 500', () => {
        for (const source of SOURCES) {
            expect(statusFor(codeFor(source))).not.toBe(500);
        }
    });

    it('answers a dependency being down with 503, not a throttle', () => {
        expect(statusFor(codeFor('database'))).toBe(503);
        expect(statusFor(codeFor('cache'))).toBe(503);
        expect(codeFor('cache')).not.toBe('rate_limited');
    });

    it('keeps provider and hosting failures as bad-gateway', () => {
        expect(statusFor(codeFor('ai'))).toBe(502);
        expect(statusFor(codeFor('hosting'))).toBe(502);
    });

    it('gives every source a real message, never a code echoed back', () => {
        for (const source of SOURCES) {
            const message = messageFor(source);

            expect(message.length).toBeGreaterThan(20);
            expect(message).not.toContain('_');
            expect(message.trim()).toBe(message);
        }
    });

    it('builds an ApiError that carries the mapped code', () => {
        const error = upstreamFailure('database', new Error('connection reset'));

        expect(error).toBeInstanceOf(ApiError);
        expect(error.code).toBe('service_unavailable');
    });

    it('survives a non-Error cause', () => {
        expect(() => upstreamFailure('ai', 'provider said no')).not.toThrow();
    });
});

describe('the error catalogue and the spec agree', () => {
    it('documents exactly the codes the server can emit', () => {
        const yaml = readFileSync(join(process.cwd(), 'docs/openapi.yaml'), 'utf8');
        const marker = yaml.indexOf('enum: [unauthorized');

        expect(marker).toBeGreaterThan(-1);

        const line = yaml.slice(marker, yaml.indexOf(']', marker));
        const documented = [...line.matchAll(/[a-z_]+/g)]
            .map((m) => m[0])
            .filter((word) => word !== 'enum');

        expect([...documented].sort()).toEqual(Object.keys(ERROR_STATUS).sort());
    });
});
