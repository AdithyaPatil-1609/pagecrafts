import { NextResponse } from 'next/server';
import type { ApiResult, ErrorCode } from '@/lib/contracts';
import { statusFor } from './codes';

export class ApiError extends Error {
    constructor(
        readonly code: ErrorCode,
        message: string,
        readonly detail?: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function ok<T>(data: T, status = 200) {
    return NextResponse.json<ApiResult<T>>({ ok: true, data }, { status });
}

export function fail(code: ErrorCode, message: string, detail?: string) {
    return NextResponse.json<ApiResult<never>>(
        { ok: false, error: { code, message, ...(detail ? { detail } : {}) } },
        { status: statusFor(code) },
    );
}

export async function guard(handler: () => Promise<Response>): Promise<Response> {
    try {
        return await handler();
    } catch (err) {
        if (err instanceof ApiError) return fail(err.code, err.message, err.detail);
        console.error('[api]', err);
        return fail('internal', 'Something went wrong on our side.');
    }
}