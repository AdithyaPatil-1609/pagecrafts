export const EVENTS = {
    "EV-01": "landing_viewed",
    "EV-02": "signin_started",
    "EV-03": "signin_completed",
    "EV-04": "generate_started",
    "EV-05": "generate_completed",
    // The publish funnel (R3 D20). The catalogue had nothing for it, so on launch day
    // "watch the publish funnel" had nothing to watch — the one funnel that takes money,
    // and the one whose edge cases the whole of week 4 was about.
    //
    // Three events rather than two, because the question support actually gets asked is
    // "did it work?", and the honest answer has three shapes: it is still going, it went
    // live, or it stopped. `publish_failed` carries the failure reason from
    // lib/deploy/failure.ts — a closed set, which is what makes it groupable rather than a
    // pile of distinct strings.
    "EV-06": "publish_started",
    "EV-07": "publish_completed",
    "EV-08": "publish_failed",
} as const;

export type EventId = keyof typeof EVENTS;
export type EventName = (typeof EVENTS)[EventId];

export type EventProperties = Record<string, string | number | boolean | null>;
