import { describe, expect, it, afterEach } from 'vitest';
import { delayForAttempt, setBackoffClock, MAX_RATE_LIMIT_ATTEMPTS } from '@/lib/ai/gateway/backoff';

afterEach(() => setBackoffClock(null));

describe('429 backoff', () => {
    it('honours Retry-After: 0 as retry immediately', () => {
        expect(delayForAttempt(0, 0)).toBe(0);
    });

    it('honours a positive Retry-After up to the cap', () => {
        expect(delayForAttempt(0, 2_000)).toBe(2_000);
        expect(delayForAttempt(0, 60_000)).toBe(30_000);
    });

    it('uses exponential backoff with jitter when Retry-After is absent', () => {
        setBackoffClock({ sleep: async () => {}, jitter: () => 0.5 });
        expect(delayForAttempt(0, -1)).toBe(250);
        expect(delayForAttempt(1, -1)).toBe(500);
        expect(delayForAttempt(2, -1)).toBe(1_000);
    });

    it('bounds the number of attempts', () => {
        expect(MAX_RATE_LIMIT_ATTEMPTS).toBe(3);
    });
});
