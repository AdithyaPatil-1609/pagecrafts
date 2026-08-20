import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ErrorCode } from '@/lib/contracts';
import { ERROR_STATUS, statusFor } from '@/lib/errors/codes';
import { friendlyMessage, OFFLINE_MESSAGE, UNREADABLE_MESSAGE } from '@/lib/api/messages';
import { LANDING_ERRORS, landingError } from '@/lib/auth/landing-errors';

// D14/D15: "no unmapped errors anywhere".
//
// Adding an ErrorCode means touching four places — the contract, the status map, the
// friendly messages and the OpenAPI enum. The drift test in upstream.test.ts already holds
// the spec and the status map together; nothing held the *messages* to either, so a code
// could ship with a correct status and nothing written for the person reading it.
//
// A missing message is not a crash, which is exactly why it survives review: the API answers
// with a sensible status and the UI shows whatever fallback string the caller happened to
// pass. This file makes that a red test instead.

const ALL_CODES = Object.keys(ERROR_STATUS) as ErrorCode[];

const SENTINEL = '__no_message_was_written_for_this_code__';

describe('every error code is fully mapped', () => {
    it('has at least one code to check', () => {
        expect(ALL_CODES.length).toBeGreaterThan(0);
    });

    it('gives every code an HTTP status', () => {
        for (const code of ALL_CODES) {
            expect(Number.isInteger(statusFor(code)), `${code} has no status`).toBe(true);
            expect(statusFor(code)).toBeGreaterThanOrEqual(400);
            expect(statusFor(code)).toBeLessThan(600);
        }
    });

    it('gives every code a message written for a person, not the fallback', () => {
        for (const code of ALL_CODES) {
            const message = friendlyMessage(code, SENTINEL);

            expect(message, `${code} falls through to the caller's fallback`).not.toBe(SENTINEL);
        }
    });

    // The failure this catches is a message that is really the code in disguise —
    // "validation_failed" shown to somebody who has never heard the phrase.
    it('never shows a machine code to the reader', () => {
        for (const code of ALL_CODES) {
            const message = friendlyMessage(code, SENTINEL);

            expect(message, `${code} reads like an identifier`).not.toContain('_');
            expect(message.length, `${code} is too terse to explain anything`).toBeGreaterThan(20);
            expect(message.trim()).toBe(message);
            expect(message).toMatch(/[.!]$/);
        }
    });

    it('says something for a connection that never reached us', () => {
        for (const message of [OFFLINE_MESSAGE, UNREADABLE_MESSAGE]) {
            expect(message.length).toBeGreaterThan(20);
            expect(message).not.toContain('_');
        }
    });

    it('keeps the four catalogues on the same set of codes', () => {
        const contract = readFileSync(
            join(process.cwd(), 'src/lib/contracts/error-codes.ts'),
            'utf8',
        );
        const messages = readFileSync(join(process.cwd(), 'src/lib/api/messages.ts'), 'utf8');

        for (const code of ALL_CODES) {
            expect(contract, `${code} missing from the contract`).toContain(`"${code}"`);
            expect(messages, `${code} missing from the message catalogue`).toContain(`${code}:`);
        }
    });
});

// The auth routes cannot answer with an error envelope — a browser coming back from Google
// or from an emailed link gets a redirect. They carry the reason in `?error=`, and a value
// with nothing written for it lands the user on an ordinary-looking page that silently does
// not work. This reads the routes rather than trusting a list kept by hand.
describe('every auth redirect explains itself', () => {
    const authRoutes = join(process.cwd(), 'src/app/api/v1/auth');

    function routeFiles(dir: string): string[] {
        return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) return routeFiles(path);
            return entry.name === 'route.ts' ? [path] : [];
        });
    }

    const redirected = [
        ...new Set(
            routeFiles(authRoutes).flatMap((file) =>
                [...readFileSync(file, 'utf8').matchAll(/redirect\("\/(?:signin)?\?error=([a-z_]+)"\)/g)].map(
                    (match) => match[1],
                ),
            ),
        ),
    ];

    it('finds the redirects it is meant to be checking', () => {
        expect(redirected.length).toBeGreaterThan(0);
    });

    it('has a sentence for every reason a route redirects with', () => {
        for (const code of redirected) {
            expect(landingError(code), `?error=${code} shows the user nothing`).toBeTruthy();
        }
    });

    it('writes those sentences for a person', () => {
        for (const [code, message] of Object.entries(LANDING_ERRORS)) {
            expect(message.length, `${code} is too terse`).toBeGreaterThan(20);
            expect(message).not.toContain('_');
            expect(message).toMatch(/[.!]$/);
        }
    });

    // Anybody can type ?error=whatever into the address bar. Showing a generic apology for
    // that would alarm somebody whose sign-in worked perfectly well.
    it('stays quiet about a value it does not recognise', () => {
        expect(landingError('not_a_real_code')).toBeNull();
        expect(landingError(undefined)).toBeNull();
        expect(landingError('')).toBeNull();
    });
});
