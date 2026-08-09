import { beforeEach, describe, expect, it } from "vitest";

import { stubFetch } from "@/lib/api-stubs/fetch";
import { STUB_PROJECT_ID, resetStubs, stubContent, stubGetFile } from "@/lib/api-stubs/persistence";
import { responseSchema, validate } from "../support/openapi";

// The stubs Preethi and Hanish build against are held to the same openapi.yaml schemas as
// the live routes (R3 D4).
//
// A stub that answers in a shape the real API never returns is worse than no stub: it buys
// a week of progress and pays for it with an integration day where nothing fits. Running
// both against one spec is what makes "you can build against this" a promise rather than a
// hope — when the real route changes shape, the contract test fails for the stub too.

const base = `/api/v1/projects/${STUB_PROJECT_ID}`;

async function get(path: string) {
    const response = await stubFetch(`${base}${path}`);
    return { status: response.status, body: await response.json() };
}

async function send(path: string, method: string, body: unknown) {
    const response = await stubFetch(`${base}${path}`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}

// `status` is a number for a success and the literal "default" for the failure envelope,
// which is how the spec itself keys them.
function expectSpec(body: unknown, path: string, method: string, status: number | "default") {
    expect(validate(responseSchema(path, method, status), body)).toEqual([]);
}

beforeEach(() => {
    resetStubs();
});

describe("stub responses match the documented contract", () => {
    it("GET /projects/{id}", async () => {
        const { status, body } = await get("");
        expect(status).toBe(200);
        expectSpec(body, "/projects/{projectId}", "get", 200);
    });

    it("GET /projects/{id}/files", async () => {
        const { status, body } = await get("/files");
        expect(status).toBe(200);
        expectSpec(body, "/projects/{projectId}/files", "get", 200);
        expect(Object.keys(body.data.files)).toContain("index.html");
    });

    it("GET /projects/{id}/files/{path}", async () => {
        const { status, body } = await get("/files/index.html");
        expect(status).toBe(200);
        expectSpec(body, "/projects/{projectId}/files/{path}", "get", 200);
    });

    it("PUT /projects/{id}/files/{path}", async () => {
        const { status, body } = await send("/files/index.html", "PUT", { content: "<h1>new</h1>" });
        expect(status).toBe(200);
        expectSpec(body, "/projects/{projectId}/files/{path}", "put", 200);
        expect(body.data.dirty).toBe(true);
    });

    it("DELETE /projects/{id}/files/{path}", async () => {
        const { status, body } = await send("/files/styles.css", "DELETE", undefined);
        expect(status).toBe(200);
        expectSpec(body, "/projects/{projectId}/files/{path}", "delete", 200);
    });

    it("GET /projects/{id}/commits", async () => {
        const { status, body } = await get("/commits");
        expect(status).toBe(200);
        expectSpec(body, "/projects/{projectId}/commits", "get", 200);
        // One of each author, so a history UI can style all three without inventing data.
        expect(body.data.items.map((c: { author: string }) => c.author).sort()).toEqual([
            "ai_edit",
            "system",
            "user",
        ]);
    });

    it("PATCH /projects/{id}/content", async () => {
        const { status, body } = await send("/content", "PATCH", {
            ops: [{ path: "hero.headline", value: "New headline" }],
        });
        expect(status).toBe(200);
        expectSpec(body, "/projects/{projectId}/content", "patch", 200);
    });
});

describe("stub failures match the documented envelope", () => {
    it("404s an unknown file, with the code the real route uses", async () => {
        const { status, body } = await get("/files/nope.html");
        expect(status).toBe(404);
        expectSpec(body, "/projects/{projectId}/files/{path}", "get", "default");
        expect(body.error.code).toBe("not_found");
    });

    // Traversal cannot arrive over HTTP at all: URL parsing resolves "../" — and the
    // percent-encoded "%2E%2E" too — before any handler sees a path, so both shapes reach
    // the route as some other address entirely. The path guard is therefore a backstop for
    // callers that reach the data layer directly, not the front line, and each is tested
    // where it actually bites.
    it("collapses a traversal URL into an ordinary miss (404), never a file outside the project", async () => {
        for (const attempt of ["/files/../secrets.env", "/files/%2E%2E/secrets.env"]) {
            const { status, body } = await get(attempt);
            expect(status, attempt).toBe(404);
            expect(body.error.code).toBe("not_found");
        }
    });

    it("422s a traversal path handed straight to the stub, as the guard promises (C-02)", async () => {
        const result = stubGetFile("../secrets.env");
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe("validation_failed");
    });

    it("422s an empty op list", async () => {
        const { status, body } = await send("/content", "PATCH", { ops: [] });
        expect(status).toBe(422);
        expectSpec(body, "/projects/{projectId}/content", "patch", "default");
    });

    it("404s an address the API does not have", async () => {
        const response = await stubFetch("/api/v1/nothing/here");
        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("not_found");
    });
});

describe("stubs are deterministic and behave like the real thing", () => {
    it("returns byte-identical responses across calls", async () => {
        const first = await get("/commits");
        const second = await get("/commits");
        expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
    });

    it("reads back a write within a session", async () => {
        await send("/files/index.html", "PUT", { content: "<h1>edited</h1>" });
        const { body } = await get("/files/index.html");
        expect(body.data.content).toBe("<h1>edited</h1>");
    });

    it("does not grow history on a file write — saving is not committing (V-4)", async () => {
        const before = await get("/commits");
        await send("/files/index.html", "PUT", { content: "<h1>edited</h1>" });
        const after = await get("/commits");
        expect(after.body.data.items).toEqual(before.body.data.items);
    });

    it("applies a content op to the nested path it names", async () => {
        await send("/content", "PATCH", { ops: [{ path: "hero.headline", value: "Fresh" }] });
        expect(stubContent()).toMatchObject({ hero: { headline: "Fresh" } });
    });

    it("resets to the same opening position every time", async () => {
        await send("/files/index.html", "PUT", { content: "<h1>changed</h1>" });
        resetStubs();
        const { body } = await get("/files/index.html");
        expect(body.data.content).not.toBe("<h1>changed</h1>");
    });

    it("rebuilds nested paths the way the real catch-all route does", async () => {
        await send("/files/sections/hero.html", "PUT", { content: "<section>hi</section>" });
        const { body } = await get("/files/sections/hero.html");
        expect(body.data.path).toBe("sections/hero.html");
    });
});
