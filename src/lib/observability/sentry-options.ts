const REDACTED = "[redacted]";

const SENSITIVE_KEYS = [
    "prompt",
    "content",
    "html",
    "email",
    "password",
    "token",
    "authorization",
    "cookie",
    "apikey",
    "api_key",
    "secret",
];

type Loose = Record<string, unknown>;

function looksSensitive(key: string): boolean {
    const lowered = key.toLowerCase();
    return SENSITIVE_KEYS.some((banned) => lowered.includes(banned));
}

export function scrub<T>(value: T, depth = 0): T {
    if (depth > 6 || value === null || typeof value !== "object") return value;

    if (Array.isArray(value)) {
        return value.map((item) => scrub(item, depth + 1)) as unknown as T;
    }

    const source = value as Loose;
    const output: Loose = {};

    for (const key of Object.keys(source)) {
        output[key] = looksSensitive(key) ? REDACTED : scrub(source[key], depth + 1);
    }

    return output as T;
}

export const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

export const shared = {
    dsn,
    environment,
    enabled: dsn.length > 0,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend<T extends { request?: unknown; extra?: unknown; contexts?: unknown }>(event: T): T {
        if (event.request) event.request = scrub(event.request);
        if (event.extra) event.extra = scrub(event.extra);
        if (event.contexts) event.contexts = scrub(event.contexts);
        return event;
    },
};
