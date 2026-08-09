import * as Sentry from "@sentry/nextjs";
import { shared } from "@/lib/observability/sentry-options";

if (shared.enabled) {
    Sentry.init(shared);
} else {
    console.warn("[sentry] no NEXT_PUBLIC_SENTRY_DSN, browser error reporting is off");
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
