import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchImages } from "@/lib/images/unsplash";
import { ApiError } from "@/lib/errors/respond";

// The photo library's server half (S-1). Two things matter here and nothing else does: the
// access key never appears in what we hand back, and every way Unsplash can let us down
// arrives as a sentence someone can act on rather than a bare 500.

const KEY = "unsplash-test-key";

const PHOTO = {
    id: "abc123",
    alt_description: "a flat white on a wooden table",
    width: 4000,
    height: 3000,
    urls: { small: "https://images.unsplash.com/small.jpg", regular: "https://images.unsplash.com/regular.jpg" },
    user: { name: "Ada Lovelace", username: "ada", links: { html: "https://unsplash.com/@ada" } },
};

function reply(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Checked by shape rather than by `instanceof`: one case reloads the module graph to get a
// differently configured server, and a reloaded ApiError is a different class object.
async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
    try {
        await promise;
    } catch (error) {
        expect((error as Error).name).toBe(new ApiError("internal", "").name);
        expect(typeof (error as ApiError).code).toBe("string");
        return error as ApiError;
    }
    throw new Error("expected the search to fail, and it did not");
}

// serverEnv() validates the whole server environment, not just the key this module reads,
// so a unit test of the photo library still has to look like a configured server.
const BASE_ENV: Record<string, string> = {
    NEXT_PUBLIC_APP_URL: "https://pagecrafts.test",
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    UPSTASH_REDIS_REST_URL: "https://redis.test",
    UPSTASH_REDIS_REST_TOKEN: "redis-token",
};

beforeEach(() => {
    for (const [name, value] of Object.entries(BASE_ENV)) vi.stubEnv(name, value);
    vi.stubEnv("UNSPLASH_ACCESS_KEY", KEY);
    // serverEnv() caches on first read; each test gets a fresh module graph so the stubbed
    // value is the one it sees.
    vi.resetModules();
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("searching the photo library", () => {
    it("asks Unsplash with the key in the header, never in the reply", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ results: [PHOTO], total_pages: 3 }));

        const result = await searchImages("coffee", 1);

        const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
        expect(String(url)).toContain("query=coffee");
        expect(String(url)).toContain("page=1");
        expect((init.headers as Record<string, string>).Authorization).toContain(KEY);
        expect(JSON.stringify(result)).not.toContain(KEY);
    });

    it("hands back what the picker needs and nothing more", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ results: [PHOTO], total_pages: 3 }));

        const { items, page, totalPages } = await searchImages("coffee", 1);

        expect(page).toBe(1);
        expect(totalPages).toBe(3);
        expect(items).toEqual([
            {
                id: "abc123",
                description: "a flat white on a wooden table",
                thumbUrl: "https://images.unsplash.com/small.jpg",
                fullUrl: "https://images.unsplash.com/regular.jpg",
                width: 4000,
                height: 3000,
                attribution: { name: "Ada Lovelace", username: "ada", link: "https://unsplash.com/@ada" },
            },
        ]);
    });

    it("drops a result with no usable image rather than shipping a broken tile", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            reply({ results: [PHOTO, { id: "no-urls" }], total_pages: 1 }),
        );

        const { items } = await searchImages("coffee", 1);
        expect(items.map((i) => i.id)).toEqual(["abc123"]);
    });

    it("is an empty answer, not an error, when nothing matches", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ results: [], total_pages: 0 }));

        const { items, totalPages } = await searchImages("qwertyuiop", 1);
        expect(items).toEqual([]);
        expect(totalPages).toBe(0);
    });

    it("says so plainly when the server was never given a key", async () => {
        vi.stubEnv("UNSPLASH_ACCESS_KEY", "");
        vi.resetModules();
        const { searchImages: fresh } = await import("@/lib/images/unsplash");

        const error = await expectApiError(fresh("coffee", 1));
        expect(error.code).toBe("validation_failed");
        expect(error.message).toContain("upload an image instead");
    });

    it("reads Unsplash's own rate limit as a rate limit", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({}, 429));

        const error = await expectApiError(searchImages("coffee", 1));
        expect(error.code).toBe("rate_limited");
        expect(error.message).toContain("try again");
    });

    it("does not blame the user for an outage", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({}, 503));

        const error = await expectApiError(searchImages("coffee", 1));
        expect(error.code).toBe("internal");
        expect(error.detail).toContain("503");
    });

    it("survives the network being gone", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

        const error = await expectApiError(searchImages("coffee", 1));
        expect(error.code).toBe("internal");
    });

    it("survives a reply that is not the JSON it claims to be", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response("<html>nope</html>", { status: 200 }),
        );

        const { items } = await searchImages("coffee", 1);
        expect(items).toEqual([]);
    });
});
