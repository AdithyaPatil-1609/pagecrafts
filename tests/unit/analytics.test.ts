import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { capture, isAnalyticsEnabled } from "@/lib/observability/analytics";
import { EVENTS } from "@/lib/observability/events";

const fetchMock = vi.fn();

beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("capture", () => {
    it("sends the event name the documentation specifies", async () => {
        await capture("EV-02", "user-1");

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.event).toBe("signin_started");
        expect(body.event).toBe(EVENTS["EV-02"]);
        expect(body.distinct_id).toBe("user-1");
        expect(body.properties.requirement).toBe("EV-02");
    });

    it("posts to the configured host", async () => {
        await capture("EV-03", "user-1");

        expect(fetchMock.mock.calls[0][0]).toBe("https://eu.i.posthog.com/capture/");
    });

    it("does nothing when PostHog is not configured", async () => {
        vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");

        await capture("EV-02", "user-1");

        expect(fetchMock).not.toHaveBeenCalled();
        expect(isAnalyticsEnabled()).toBe(false);
    });

    it("refuses properties that could carry user text", async () => {
        await capture("EV-02", "user-1", { prompt: "a bakery in Pune" });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuses an email property", async () => {
        await capture("EV-02", "user-1", { email: "someone@example.com" });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("allows category and latency_bucket on generate events, never tokens", async () => {
        await capture("EV-05", "user-1", { category: "healthcare", latency_bucket: "15-30s" });
        expect(fetchMock).toHaveBeenCalledOnce();

        fetchMock.mockClear();
        await capture("EV-05", "user-1", { tokens: 900 });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("allows safe properties through", async () => {
        await capture("EV-03", "user-1", { method: "password", ok: true });

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.properties.method).toBe("password");
        expect(body.properties.ok).toBe(true);
    });

    it("never throws when the network fails", async () => {
        fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

        await expect(capture("EV-02", "user-1")).resolves.toBeUndefined();
    });
});
