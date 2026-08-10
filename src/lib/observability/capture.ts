import { shared } from "./sentry-options";

export interface CaptureContext {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
}

export function captureError(error: unknown, context: CaptureContext = {}): void {
    if (!shared.enabled) return;

    const thrown = error instanceof Error ? error : new Error(String(error));

    void import("@sentry/nextjs")
        .then((sentry) => sentry.captureException(thrown, context))
        .catch(() => {});
}
