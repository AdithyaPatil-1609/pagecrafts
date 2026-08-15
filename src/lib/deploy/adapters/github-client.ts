import 'server-only';
import { deployConfig } from '../config';
import { readDeployCredential, redact } from '../credentials';

export class HostingError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'HostingError';
    }
}

export async function gh<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
): Promise<{ status: number; data: T }> {
    const res = await fetch(`${deployConfig().apiBase}${path}`, {
        method,
        headers: {
            authorization: `Bearer ${readDeployCredential()}`,
            accept: 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
            'content-type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
        const message = data?.message ?? res.statusText;
        throw new HostingError(redact(String(message)), res.status);
    }

    return { status: res.status, data: data as T };
}