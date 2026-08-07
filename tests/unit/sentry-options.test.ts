import { describe, it, expect } from "vitest";
import { scrub } from "@/lib/observability/sentry-options";

describe("scrub", () => {
    it("redacts a prompt", () => {
        expect(scrub({ prompt: "a bakery in Pune" })).toEqual({ prompt: "[redacted]" });
    });

    it("redacts auth headers and cookies", () => {
        const input = { headers: { authorization: "Bearer abc", cookie: "sb=1", accept: "json" } };

        expect(scrub(input)).toEqual({
            headers: { authorization: "[redacted]", cookie: "[redacted]", accept: "json" },
        });
    });

    it("redacts nested user text", () => {
        const input = { body: { siteContent: "<h1>hi</h1>" }, path: "/api/v1/projects" };
        const output = scrub(input) as Record<string, unknown>;

        expect(output.body).toBe("[redacted]");
        expect(output.path).toBe("/api/v1/projects");
    });

    it("walks arrays", () => {
        const input = { items: [{ email: "a@b.com", id: "1" }] };
        const output = scrub(input) as { items: Array<Record<string, unknown>> };

        expect(output.items[0].email).toBe("[redacted]");
        expect(output.items[0].id).toBe("1");
    });

    it("leaves harmless values alone", () => {
        const input = { route: "/api/v1/auth/login", status: 429, ok: false };

        expect(scrub(input)).toEqual(input);
    });

    it("survives null and primitives", () => {
        expect(scrub(null)).toBe(null);
        expect(scrub("plain")).toBe("plain");
        expect(scrub(7)).toBe(7);
    });

    it("stops at a depth limit rather than recursing forever", () => {
        const cyclic: Record<string, unknown> = { name: "root" };
        cyclic.self = cyclic;

        expect(() => scrub(cyclic)).not.toThrow();
    });
});
