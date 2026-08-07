export const EVENTS = {
    "EV-01": "landing_viewed",
    "EV-02": "signin_started",
    "EV-03": "signin_completed",
} as const;

export type EventId = keyof typeof EVENTS;
export type EventName = (typeof EVENTS)[EventId];

export type EventProperties = Record<string, string | number | boolean | null>;
