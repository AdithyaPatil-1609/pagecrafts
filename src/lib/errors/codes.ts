import type { ErrorCode } from '@/lib/contracts';

export const ERROR_STATUS: Record<ErrorCode, number> = {
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    rate_limited: 429,
    spend_capped: 402,
    validation_failed: 422,
    generation_failed: 502,
    payment_required: 402,
    hosting_error: 502,
    github_not_connected: 409,
    github_error: 502,
    internal: 500,
};

export function statusFor(code: ErrorCode): number {
    return ERROR_STATUS[code] ?? 500;
}