import * as Sentry from "@sentry/nextjs";
import { shared } from "@/lib/observability/sentry-options";

export async function register() {
    if (!shared.enabled) {
        console.warn("[sentry] no NEXT_PUBLIC_SENTRY_DSN, server error reporting is off");
        return;
    }

    if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
        Sentry.init(shared);
        console.info(`[sentry] initialised for ${process.env.NEXT_RUNTIME} (${shared.environment})`);
    }
}

export const onRequestError = Sentry.captureRequestError;
