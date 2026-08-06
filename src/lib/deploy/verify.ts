import 'server-only';

export interface VerifyOptions {
    intervalMs?: number;
    timeoutMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    check?: (url: string) => Promise<number>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function statusOf(url: string): Promise<number> {
    try {
        const res = await fetch(url, { redirect: 'follow', cache: 'no-store' });
        return res.status;
    } catch {
        return 0;
    }
}

export async function pollUntilLive(url: string, options: VerifyOptions = {}): Promise<boolean> {
    const intervalMs = options.intervalMs ?? 3000;
    const timeoutMs = options.timeoutMs ?? 90000;
    const now = options.now ?? Date.now;
    const sleep = options.sleep ?? wait;
    const check = options.check ?? statusOf;

    const deadline = now() + timeoutMs;

    for (; ;) {
        if ((await check(url)) === 200) return true;
        if (now() + intervalMs >= deadline) return false;
        await sleep(intervalMs);
    }
}