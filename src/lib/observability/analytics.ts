import "server-only";
import { EVENTS, type EventId, type EventProperties } from "@/lib/observability/events";

const FORBIDDEN_KEYS = ["prompt", "content", "html", "email", "password", "token", "body"];

type Config = { key: string; host: string };

function config(): Config | null {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();

    if (!key || !host) return null;

    return { key, host: host.replace(/\/$/, "") };
}

export function isAnalyticsEnabled(): boolean {
    return config() !== null;
}

function reject(properties: EventProperties): string | null {
    for (const name of Object.keys(properties)) {
        const lowered = name.toLowerCase();
        if (FORBIDDEN_KEYS.some((banned) => lowered.includes(banned))) return name;
    }

    return null;
}

export async function capture(
    id: EventId,
    distinctId: string,
    properties: EventProperties = {},
): Promise<void> {
    const settings = config();

    if (!settings) return;

    const offending = reject(properties);

    if (offending) {
        console.error("[analytics] refused to send a property that may carry user text", {
            event: EVENTS[id],
            property: offending,
        });
        return;
    }

    try {
        await fetch(`${settings.host}/capture/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: settings.key,
                event: EVENTS[id],
                distinct_id: distinctId,
                properties: { ...properties, requirement: id },
                timestamp: new Date().toISOString(),
            }),
            cache: "no-store",
        });
    } catch (error) {
        console.error("[analytics] capture failed", EVENTS[id], error);
    }
}

export function track(
    id: EventId,
    distinctId: string,
    properties: EventProperties = {},
): void {
    void capture(id, distinctId, properties);
}
