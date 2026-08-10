import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounceTrigger } from '@/lib/debounce';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('debounceTrigger', () => {
    it('runs once, after the delay', () => {
        const fn = vi.fn();
        const d = debounceTrigger(fn, 1000);

        d.trigger();
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('restarts the wait on every call, so rapid typing only saves once', () => {
        const fn = vi.fn();
        const d = debounceTrigger(fn, 1000);

        d.trigger();
        vi.advanceTimersByTime(700);
        d.trigger();
        vi.advanceTimersByTime(700);
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('flush runs immediately and cancels the pending wait', () => {
        const fn = vi.fn();
        const d = debounceTrigger(fn, 1000);

        d.trigger();
        d.flush();
        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('cancel means it never runs at all', () => {
        const fn = vi.fn();
        const d = debounceTrigger(fn, 1000);

        d.trigger();
        d.cancel();
        vi.advanceTimersByTime(5000);

        expect(fn).not.toHaveBeenCalled();
    });
});