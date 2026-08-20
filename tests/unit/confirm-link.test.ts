import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { safeNext } from '@/lib/auth/safe-next';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const SIGNUP = read('src/app/api/v1/auth/signup/route.ts');
const RESEND = read('src/app/api/v1/auth/verify/resend/route.ts');
const CONFIRM = read('src/app/api/v1/auth/confirm/route.ts');

function redirectTargets(source: string): string[] {
    return [...source.matchAll(/emailRedirectTo:\s*`([^`]+)`/g)].map((m) => m[1]);
}

describe('the emailed confirmation link', () => {
    it('is set on both the first email and the resend', () => {
        expect(redirectTargets(SIGNUP)).toHaveLength(1);
        expect(redirectTargets(RESEND)).toHaveLength(1);
    });

    it('carries no query string, so a TokenHash template can append one', () => {
        for (const target of [...redirectTargets(SIGNUP), ...redirectTargets(RESEND)]) {
            expect(target, `${target} would collide with ?token_hash=`).not.toContain('?');
            expect(target).toContain('/api/v1/auth/confirm');
        }
    });

    it('sends a confirmed person to the build screen, not the home page', () => {
        expect(CONFIRM).toContain('const AFTER_CONFIRM = "/new"');
        expect(safeNext(null)).toBe('/');
    });

    it('still honours an explicit next, and still refuses an off-site one', () => {
        expect(safeNext('/templates')).toBe('/templates');
        expect(safeNext('//evil.example.com')).toBe('/');
        expect(safeNext('https://evil.example.com')).toBe('/');
    });
});
