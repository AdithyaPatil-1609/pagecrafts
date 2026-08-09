export interface DebouncedTrigger {
    trigger(): void;
    flush(): void;
    cancel(): void;
}

export function debounceTrigger(fn: () => void, delayMs: number): DebouncedTrigger {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function clear() {
        if (timer) clearTimeout(timer);
        timer = null;
    }

    return {
        trigger() {
            clear();
            timer = setTimeout(fn, delayMs);
        },
        flush() {
            clear();
            fn();
        },
        cancel: clear,
    };
}