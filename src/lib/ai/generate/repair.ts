import { GatewayError } from '../gateway';

export interface RepairOutcome<T> {
    data: T;
    /** True when the first attempt failed and the retry succeeded. */
    repaired: boolean;
    /** Why the first attempt failed, kept for the eval record. */
    firstError?: string;
}

/** Run `attempt`, and on a validation failure run it exactly once more with the error context. */
export async function withOneRepair<T>(
    attempt: (repairContext?: string) => Promise<T>,
    isRepairable: (err: unknown) => boolean = defaultIsRepairable,
): Promise<RepairOutcome<T>> {
    try {
        return { data: await attempt(), repaired: false };
    } catch (err) {
        if (!isRepairable(err)) throw err;

        const firstError = err instanceof Error ? err.message : String(err);
        // The one and only retry. If this throws, it propagates to the caller,
        // which is where the template fallback lives.
        const data = await attempt(repairContextFor(err));
        return { data, repaired: true, firstError };
    }
}

/** Checks whether an error is a repairable validation failure. */
function defaultIsRepairable(err: unknown): boolean {
    if (!(err instanceof GatewayError)) return false;
    if (err.code !== 'generation_failed' || err.retryable) return false;
    const detail = err.detail as { chainExhausted?: boolean } | undefined;
    return detail?.chainExhausted !== true;
}

/** The failing fields, phrased for the model rather than for a log. */
export function repairContextFor(err: unknown): string {
    if (!(err instanceof GatewayError) || !err.detail || typeof err.detail !== 'object') {
        return 'The previous reply did not match the required shape. Return valid JSON.';
    }

    const issues = (err.detail as { issues?: Array<{ path?: unknown[]; message?: string }> }).issues;
    if (!issues?.length) {
        return 'The previous reply did not match the required shape. Return valid JSON.';
    }

    const lines = issues.slice(0, 12).map((i) => {
        const path = Array.isArray(i.path) ? i.path.join('.') : '';
        return `- ${path || '(root)'}: ${i.message ?? 'invalid'}`;
    });

    return [
        'Your previous reply failed validation. Fix exactly these problems and',
        'return the whole object again, with the same key names:',
        ...lines,
    ].join('\n');
}
