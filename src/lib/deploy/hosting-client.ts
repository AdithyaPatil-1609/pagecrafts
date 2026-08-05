import 'server-only';
import { deployConfig } from './config';
import { readDeployCredential, redact } from './credentials';

export class HostingError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = 'HostingError';
    }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${deployConfig.apiBase}${path}`, {
        method,
        headers: {
            authorization: `Bearer ${readDeployCredential()}`,
            'content-type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
    });

    const text = await res.text();
    if (!res.ok) throw new HostingError(redact(text) || res.statusText, res.status);
    return (text ? JSON.parse(text) : null) as T;
}

export const hosting = {
    get: <T>(path: string) => call<T>('GET', path),
    post: <T>(path: string, body: unknown) => call<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => call<T>('PATCH', path, body),
    whoami: () => call<{ id: string; name: string }>('GET', `/accounts/${deployConfig.accountId}`),
};