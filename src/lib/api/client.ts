import type { ApiResult } from '@/lib/contracts';
import { friendlyMessage, OFFLINE_MESSAGE, UNREADABLE_MESSAGE } from './messages';

export interface CallResult<T> {
    data: T | null;
    error: string | null;
}

async function call<T>(path: string, init?: RequestInit): Promise<CallResult<T>> {
    let response: Response;

    try {
        response = await fetch(path, {
            ...init,
            headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
        });
    } catch {
        return { data: null, error: OFFLINE_MESSAGE };
    }

    let body: ApiResult<T>;

    try {
        body = (await response.json()) as ApiResult<T>;
    } catch {
        return { data: null, error: UNREADABLE_MESSAGE };
    }

    if (!body || typeof body !== 'object' || !('ok' in body)) {
        return { data: null, error: UNREADABLE_MESSAGE };
    }

    if (!body.ok) {
        return { data: null, error: friendlyMessage(body.error.code, body.error.message) };
    }

    return { data: body.data, error: null };
}

export function apiGet<T>(path: string): Promise<CallResult<T>> {
    return call<T>(path);
}

export function apiPut<T>(path: string, payload: unknown): Promise<CallResult<T>> {
    return call<T>(path, { method: 'PUT', body: JSON.stringify(payload) });
}