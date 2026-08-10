import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const auth = vi.hoisted(() => ({ requireUser: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({
    requireUser: auth.requireUser,
    supabaseRoute: async () => ({}),
}));

vi.mock("@/lib/limits/ai-guard", () => ({
    guardAiRequest: async () => ({
        ok: true,
        release: async () => {},
        recordUsage: async () => {},
    }),
}));

import { withRoute } from "@/lib/kernel/with-route";

const schema = z.object({ text: z.string().min(1).max(500) });

const handler = withRoute({
    auth: "required",
    schema,
    handler: async ({ body }) => Response.json({ ok: true, data: body }),
});

function post(body: string, headers: Record<string, string> = {}) {
    return handler(
        new Request("http://x/api/v1/intent/classify", {
            method: "POST",
            body,
            headers: { "content-type": "application/json", ...headers },
        }) as never,
    );
}

beforeEach(() => {
    auth.requireUser.mockResolvedValue({ userId: "u_1", supabase: {} });
    vi.clearAllMocks();
});

describe("body size", () => {
    it("accepts a normal request", async () => {
        const res = await post(JSON.stringify({ text: "a bakery in Pune" }));
        expect(res.status).toBe(200);
    });

    it("refuses a body over the cap without parsing it", async () => {
        const huge = JSON.stringify({ text: "x".repeat(200_000) });
        const res = await post(huge);

        expect(res.status).toBe(413);
        expect((await res.json()).error.code).toBe("payload_too_large");
    });

    it("refuses on a declared content-length, before reading the body", async () => {
        const res = await post(JSON.stringify({ text: "small" }), {
            "content-length": String(10 * 1024 * 1024),
        });

        expect(res.status).toBe(413);
    });
});

describe("what a rejection tells the caller", () => {
    it("does not return the zod message, which names fields and constraints", async () => {
        const res = await post(JSON.stringify({ text: "" }));
        const json = await res.json();

        expect(res.status).toBe(422);
        expect(json.error.code).toBe("validation_failed");
        expect(json.error.detail).toBeUndefined();
        expect(JSON.stringify(json)).not.toContain("text");
        expect(JSON.stringify(json)).not.toContain("String must contain");
    });

    it("logs the failing field names server-side so the rejection is still debuggable", async () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

        await post(JSON.stringify({ text: "" }));

        expect(spy).toHaveBeenCalledWith(
            "[api] rejected body",
            expect.objectContaining({ issues: ["text"] }),
        );

        spy.mockRestore();
    });

    it("treats malformed json as a validation failure, not a crash", async () => {
        const res = await post("{ not json");

        expect(res.status).toBe(422);
    });

    it("treats an empty body as a validation failure", async () => {
        const res = await post("");

        expect(res.status).toBe(422);
    });
});
