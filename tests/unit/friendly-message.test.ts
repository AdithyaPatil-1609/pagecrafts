import { describe, it, expect } from 'vitest';
import { friendlyMessage } from '@/lib/api/messages';

// The describe form showed "Some of your files were rejected" on a screen with no files,
// because friendlyMessage read `FRIENDLY[code] ?? fallback` over an exhaustive Record --
// the left side was never undefined, so whatever the route actually said was discarded.

describe('friendlyMessage', () => {
    it('says what the route said, when the route said something', () => {
        expect(friendlyMessage('validation_failed', 'Enter a valid phone number.'))
            .toBe('Enter a valid phone number.');
    });

    it('falls back to ours when the route gave nothing', () => {
        expect(friendlyMessage('validation_failed', '')).toBe('Something in that was not accepted.');
        expect(friendlyMessage('not_found', '   ')).toBe('We could not find this project.');
    });

    it('never claims files on a screen that has none', () => {
        for (const code of ['validation_failed', 'payload_too_large'] as const) {
            expect(friendlyMessage(code, '')).not.toMatch(/file/i);
        }
    });

    it('has something to say for every code, so nothing lands as undefined', () => {
        const codes = [
            'unauthorized', 'forbidden', 'not_found', 'conflict', 'rate_limited',
            'spend_capped', 'validation_failed', 'payload_too_large', 'generation_failed',
            'payment_required', 'hosting_error', 'service_unavailable', 'internal',
        ] as const;

        for (const code of codes) {
            const said = friendlyMessage(code, '');

            expect(said, `${code} has no message`).toBeTruthy();
            expect(said).not.toContain('undefined');
        }
    });

    it('does not leak a code where a sentence belongs', () => {
        for (const code of ['service_unavailable', 'payload_too_large'] as const) {
            expect(friendlyMessage(code, '')).not.toContain('_');
        }
    });
});
