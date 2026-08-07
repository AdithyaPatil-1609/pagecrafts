import * as Sentry from "@sentry/nextjs";
import { shared } from "@/lib/observability/sentry-options";

if (shared.enabled) {
    Sentry.init(shared);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
