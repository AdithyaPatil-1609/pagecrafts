import * as Sentry from "@sentry/nextjs";
import { shared } from "@/lib/observability/sentry-options";

export async function register() {
    if (!shared.enabled) return;

    if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
        Sentry.init(shared);
    }
}

export const onRequestError = Sentry.captureRequestError;
