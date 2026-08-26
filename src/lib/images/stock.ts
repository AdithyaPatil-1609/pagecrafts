import { bankPhotoUrl } from "@/lib/ai/generate/photos";

/**
 * The stock photograph floor.
 *
 * Live Unsplash first, then the bundled bank. Lifted out of the job runner so the Gemini
 * path can fall back to exactly the same thing rather than a second, slightly different
 * copy of it — the two drifting apart is how "it works locally" starts.
 */

function pickIndex(salt: string, length: number): number {
    if (length <= 0) return 0;
    let hash = 0;
    for (let i = 0; i < salt.length; i += 1) {
        hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
    }
    return hash % length;
}

/**
 * A photograph for `query`, always.
 *
 * A whole page of Unsplash results comes back and only items[0] was ever read, so every
 * restaurant in the country got the same photograph and generating again returned it a
 * second time. The salt is the job id, which is why two attempts differ and two businesses
 * differ.
 */
export async function stockPhotoUrl(query: string, salt = ""): Promise<string> {
    try {
        const { isImageSearchConfigured, searchImages } = await import("@/lib/images/unsplash");
        if (!isImageSearchConfigured()) return bankPhotoUrl(query, salt);
        const { items } = await searchImages(query, 1);
        if (!items.length) return bankPhotoUrl(query, salt);
        return items[pickIndex(`${salt}:${query}`, items.length)]?.fullUrl
            ?? bankPhotoUrl(query, salt);
    } catch {
        return bankPhotoUrl(query, salt);
    }
}
