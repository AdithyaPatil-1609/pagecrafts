import { afterEach, describe, expect, it, vi } from "vitest";

import { MAX_QUERY_CHARS, searchPhotos } from "@/lib/data/unsplash-search";

// R2 D12 — photo search for the asset picker.
//
// The search runs on the server because UNSPLASH_ACCESS_KEY is a server secret: a key the
// browser holds is a key anybody can read out of the network tab and spend. These tests are
// mostly about the ways it fails, because a picker whose search is down still has to leave
// somebody a way to get a picture onto their site.

vi.mock("@/lib/config/env", () => ({
    serverEnv: () => ({ UNSPLASH_ACCESS_KEY: process.env.__TEST_KEY ?? "" }),
}));

function withKey(key: string) {
    process.env.__TEST_KEY = key;
}

function respondWith(status: number, body: unknown) {
    const fetchMock = vi.fn(async () =>
        new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.__TEST_KEY;
});

const PHOTO = {
    id: "abc123",
    alt_description: "A cup of coffee",
    urls: { thumb: "https://images.unsplash.test/thumb.jpg" },
    user: { name: "Ada Lovelace", links: { html: "https://unsplash.test/@ada" } },
};

describe("searching for a photo", () => {
    it("returns only what the picker needs", () => {
        // Not the whole Unsplash payload: a hundred fields the grid has no use for, and a
        // shape change upstream would leak straight into the client.
        withKey("k");
        respondWith(200, { results: [PHOTO] });

        return expect(searchPhotos("coffee")).resolves.toEqual([
            {
                id: "abc123",
                thumbUrl: "https://images.unsplash.test/thumb.jpg",
                description: "A cup of coffee",
                credit: { name: "Ada Lovelace", link: "https://unsplash.test/@ada" },
            },
        ]);
    });

    it("keeps the credit even when the photo has none of its own", () => {
        // Showing a credit is a licence condition, so it must never come back empty.
        withKey("k");
        respondWith(200, { results: [{ ...PHOTO, user: undefined }] });

        return expect(searchPhotos("coffee")).resolves.toMatchObject([
            { credit: { name: "Unsplash", link: "https://unsplash.com" } },
        ]);
    });

    it("skips a result with no thumbnail rather than rendering a hole", () => {
        withKey("k");
        respondWith(200, { results: [{ id: "x" }, PHOTO] });

        return expect(searchPhotos("coffee")).resolves.toHaveLength(1);
    });

    it("sends the search to Unsplash with the key in a header, never in the URL", async () => {
        // A key in a query string ends up in logs, proxies and referrers.
        withKey("secret-key");
        const fetchMock = respondWith(200, { results: [] });

        await searchPhotos("coffee");

        const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
        expect(String(url)).not.toContain("secret-key");
        expect((init.headers as Record<string, string>).Authorization).toBe("Client-ID secret-key");
    });

    it("asks for nothing when the box is empty", async () => {
        withKey("k");
        const fetchMock = respondWith(200, { results: [PHOTO] });

        await expect(searchPhotos("   ")).resolves.toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("caps an over-long query rather than passing it straight through", async () => {
        withKey("k");
        const fetchMock = respondWith(200, { results: [] });

        await searchPhotos("x".repeat(500));

        const [url] = fetchMock.mock.calls[0] as unknown as [URL];
        expect(new URL(String(url)).searchParams.get("query")).toHaveLength(MAX_QUERY_CHARS);
    });
});

describe("when search cannot answer", () => {
    it("says so, and points at upload, when no key is configured", async () => {
        withKey("");

        await expect(searchPhotos("coffee")).rejects.toMatchObject({
            code: "service_unavailable",
            message: expect.stringContaining("upload"),
        });
    });

    it("reports a spent quota as rate_limited, not as our failure", async () => {
        // Unsplash answers 403 when the hourly quota is gone. `internal` would tell somebody
        // to retry immediately, which is the one thing that cannot work.
        withKey("k");
        respondWith(403, {});

        await expect(searchPhotos("coffee")).rejects.toMatchObject({ code: "rate_limited" });
    });

    it("stays usable when Unsplash is down — the error still mentions upload", async () => {
        withKey("k");
        respondWith(500, {});

        await expect(searchPhotos("coffee")).rejects.toMatchObject({
            code: "service_unavailable",
            message: expect.stringContaining("upload"),
        });
    });
});
