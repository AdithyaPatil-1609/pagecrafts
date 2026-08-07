import 'server-only';

const TTL_MS = 24 * 60 * 60 * 1000;

interface Entry {
    createdAt: number;
    result: Promise<unknown>;
}

const entries = new Map<string, Entry>();

export function runOnce<T>(key: string, work: () => Promise<T>): Promise<T> {
    const existing = entries.get(key);

    if (existing && Date.now() - existing.createdAt < TTL_MS) {
        return existing.result as Promise<T>;
    }

    const result = work();
    entries.set(key, { createdAt: Date.now(), result });
    result.catch(() => entries.delete(key));

    return result;
}

export function forget(key: string): void {
    entries.delete(key);
}