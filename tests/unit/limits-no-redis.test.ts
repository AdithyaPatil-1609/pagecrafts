import { beforeEach, describe, expect, it, vi } from "vitest";

// What the limiters do on an instance with no redis configured — a local checkout, a
// preview deploy, a self-hoster who never set the variable.
//
// They fail *open*. That is the opposite of the unreachable-redis path, which fails closed
// (see spend/rate-limit/ai-guard): an instance that cannot reach a redis it was told about
// has lost its accounting and must stop, but an instance that was never given one is not
// broken and must not refuse every request it sees. Getting these two the same way round
// would either lock out every local developer or silently uncap production.
//
// Lives apart from the other limits tests because vi.mock is per-file, and this whole file
// is the case where isRedisConfigured() is false.

const evalMock = vi.fn();
const hgetall = vi.fn();
const hincrby = vi.fn();
const hincrbyfloat = vi.fn();
const expire = vi.fn();
const zrem = vi.fn();

vi.mock("@/lib/limits/redis", () => ({
    isRedisConfigured: () => false,
    redis: () => ({
        eval: evalMock,
        hgetall,
        hincrby,
        hincrbyfloat,
        expire,
        zrem,
    }),
}));

import { consume } from "@/lib/limits/rate-limit";
import { checkSpend, recordSpend } from "@/lib/limits/spend";
import { acquireSlot } from "@/lib/limits/concurrency";
import { AI_PER_USER_HOUR } from "@/lib/limits/config";

beforeEach(() => {
    vi.clearAllMocks();
});

const untouched = () => {
    for (const mock of [evalMock, hgetall, hincrby, hincrbyfloat, expire, zrem]) {
        expect(mock).not.toHaveBeenCalled();
    }
};

describe("with no redis configured", () => {
    it("lets a rate-limited action through with its full allowance", async () => {
        const result = await consume("ai", "user-1", AI_PER_USER_HOUR);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(AI_PER_USER_HOUR.limit);
        expect(result.retryAfterSeconds).toBe(0);
        // Not degraded: nothing has degraded. There is no redis to have lost.
        expect(result.degraded).toBe(false);
        untouched();
    });

    it("allows spend, and names no scope or reason for refusing it", async () => {
        const verdict = await checkSpend("user-1");

        expect(verdict.allowed).toBe(true);
        expect(verdict.scope).toBeNull();
        expect(verdict.reason).toBeNull();
        expect(verdict.degraded).toBe(false);
        untouched();
    });

    it("records no spend rather than throwing on a client it has not got", async () => {
        await expect(recordSpend("user-1", 25)).resolves.toBeUndefined();
        untouched();
    });

    it("grants a concurrency slot whose release is safe to call", async () => {
        const slot = await acquireSlot("generate");

        expect(slot.acquired).toBe(true);
        expect(slot.degraded).toBe(false);
        await expect(slot.release()).resolves.toBeUndefined();
        untouched();
    });
});
