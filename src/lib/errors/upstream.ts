import type { ErrorCode } from "@/lib/contracts";
import { captureError } from "@/lib/observability/capture";
import { ApiError } from "./respond";

export type Upstream = "ai" | "hosting" | "database" | "cache";

const CODE: Record<Upstream, ErrorCode> = {
    ai: "generation_failed",
    hosting: "hosting_error",
    database: "service_unavailable",
    cache: "service_unavailable",
};

const MESSAGE: Record<Upstream, string> = {
    ai: "The site generator is not answering right now. Try again in a moment.",
    hosting: "Publishing is unavailable right now. Nothing you have made is lost.",
    database: "We could not reach your saved work just now. Try again in a moment.",
    cache: "We are having trouble keeping up right now. Try again in a moment.",
};

export function codeFor(source: Upstream): ErrorCode {
    return CODE[source];
}

export function messageFor(source: Upstream): string {
    return MESSAGE[source];
}

export function reportUpstream(
    source: Upstream,
    cause: unknown,
    extra: Record<string, unknown> = {},
): void {
    console.error(`[upstream:${source}]`, {
        reason: cause instanceof Error ? cause.message : String(cause),
        ...extra,
    });

    captureError(cause, { tags: { upstream: source }, extra });
}

export function upstreamFailure(
    source: Upstream,
    cause: unknown,
    extra: Record<string, unknown> = {},
): ApiError {
    reportUpstream(source, cause, extra);

    return new ApiError(CODE[source], MESSAGE[source]);
}
