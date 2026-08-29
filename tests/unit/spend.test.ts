import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, Record<string, string>>();

const hgetall = vi.fn(async (key: string) => store.get(key) ?? null);
const hincrby = vi.fn(async (key: string, field: string, by: number) => {
  const row = store.get(key) ?? {};
  row[field] = String(Number(row[field] ?? 0) + by);
  store.set(key, row);
});
const hincrbyfloat = vi.fn(async (key: string, field: string, by: number) => {
  const row = store.get(key) ?? {};
  row[field] = String(Number(row[field] ?? 0) + by);
  store.set(key, row);
});
const expire = vi.fn(async () => {});

vi.mock("@/lib/limits/redis", () => ({
  // The modules under test now fail open when redis is not configured, so the mock has
  // to answer that question before any of the redis-backed paths below are reached.
  isRedisConfigured: () => true,
  redis: () => ({ hgetall, hincrby, hincrbyfloat, expire }),
}));

import {
  checkSpend,
  recordSpend,
  costInCents,
  utcDay,
  pricing,
  secondsUntilUtcMidnight,
} from "@/lib/limits/spend";
import { AI_DAILY_PER_USER, AI_DAILY_GLOBAL } from "@/lib/limits/config";

const DAY = "2026-08-09";

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("costInCents", () => {
  it("is zero on a free tier, where both prices are zero", () => {
    expect(costInCents({ inputTokens: 900_000, outputTokens: 400_000 }, 0, 0)).toBe(0);
  });

  it("prices input and output separately", () => {
    expect(costInCents({ inputTokens: 1_000_000, outputTokens: 0 }, 30, 250)).toBe(30);
    expect(costInCents({ inputTokens: 0, outputTokens: 1_000_000 }, 30, 250)).toBe(250);
  });

  it("keeps sub-cent precision rather than rounding a small call to zero", () => {
    expect(costInCents({ inputTokens: 10_000, outputTokens: 2_000 }, 30, 250)).toBeCloseTo(0.8, 3);
  });

  it("never returns a negative", () => {
    expect(costInCents({ inputTokens: 0, outputTokens: 0 }, 30, 250)).toBe(0);
  });
});

describe("checkSpend", () => {
  it("allows a user with no history", async () => {
    const verdict = await checkSpend("u1", DAY);
    expect(verdict.allowed).toBe(true);
  });

  it("refuses once the per-user request count is reached", async () => {
    store.set(`spend:user:u1:${DAY}`, { requests: String(AI_DAILY_PER_USER.requests), cents: "0" });

    const verdict = await checkSpend("u1", DAY);

    expect(verdict.allowed).toBe(false);
    expect(verdict.scope).toBe("user");
    expect(verdict.reason).toBe("requests");
  });

  it("refuses once the per-user cost is reached, even with requests to spare", async () => {
    store.set(`spend:user:u1:${DAY}`, { requests: "1", cents: String(AI_DAILY_PER_USER.cents) });

    const verdict = await checkSpend("u1", DAY);

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("cents");
  });

  it("puts the global ceiling ahead of the per-user one", async () => {
    store.set(`spend:global:${DAY}`, { requests: String(AI_DAILY_GLOBAL.requests), cents: "0" });
    store.set(`spend:user:u1:${DAY}`, { requests: String(AI_DAILY_PER_USER.requests), cents: "0" });

    const verdict = await checkSpend("u1", DAY);

    expect(verdict.scope).toBe("global");
  });

  it("does not let one user's spend block another", async () => {
    store.set(`spend:user:u1:${DAY}`, { requests: String(AI_DAILY_PER_USER.requests), cents: "0" });

    expect((await checkSpend("u1", DAY)).allowed).toBe(false);
    expect((await checkSpend("u2", DAY)).allowed).toBe(true);
  });

  it("fails closed and says so when redis is unreachable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    hgetall.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const verdict = await checkSpend("u1", DAY);

    expect(verdict.allowed).toBe(false);
    expect(verdict.degraded).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("recordSpend", () => {
  it("counts the request against both the user and the global total", async () => {
    await recordSpend("u1", 0.8, DAY);

    expect(store.get(`spend:user:u1:${DAY}`)?.requests).toBe("1");
    expect(store.get(`spend:global:${DAY}`)?.requests).toBe("1");
  });

  it("accumulates cost across calls", async () => {
    await recordSpend("u1", 0.5, DAY);
    await recordSpend("u1", 0.25, DAY);

    expect(Number(store.get(`spend:user:u1:${DAY}`)?.cents)).toBeCloseTo(0.75, 3);
  });

  it("still counts the request when the call was free", async () => {
    await recordSpend("u1", 0, DAY);

    expect(store.get(`spend:user:u1:${DAY}`)?.requests).toBe("1");
    expect(hincrbyfloat).not.toHaveBeenCalled();
  });

  it("sets an expiry so yesterday's totals cannot leak into today", async () => {
    await recordSpend("u1", 1, DAY);
    expect(expire).toHaveBeenCalled();
  });

  it("never throws when redis is down — accounting must not break the request", async () => {
    hincrby.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(recordSpend("u1", 1, DAY)).resolves.toBeUndefined();

    spy.mockRestore();
  });
});

describe("the daily window", () => {
  it("keys by UTC date", () => {
    expect(utcDay(new Date("2026-08-09T23:59:59Z"))).toBe("2026-08-09");
    expect(utcDay(new Date("2026-08-10T00:00:01Z"))).toBe("2026-08-10");
  });

  it("expires at the next UTC midnight", () => {
    expect(secondsUntilUtcMidnight(new Date("2026-08-09T23:59:00Z"))).toBe(60);
    expect(secondsUntilUtcMidnight(new Date("2026-08-09T00:00:00Z"))).toBe(86_400);
  });
});

describe("pricing", () => {
  it("is zero when the price vars are absent, so a missing config cannot break a request", () => {
    vi.stubEnv("GEMINI_PRICE_IN_PER_MTOK_CENTS", "");
    vi.stubEnv("GEMINI_PRICE_OUT_PER_MTOK_CENTS", "");

    expect(pricing()).toEqual({ inPerMTokCents: 0, outPerMTokCents: 0 });

    vi.unstubAllEnvs();
  });

  it("reads the configured prices", () => {
    vi.stubEnv("GEMINI_PRICE_IN_PER_MTOK_CENTS", "30");
    vi.stubEnv("GEMINI_PRICE_OUT_PER_MTOK_CENTS", "250");

    expect(pricing()).toEqual({ inPerMTokCents: 30, outPerMTokCents: 250 });

    vi.unstubAllEnvs();
  });

  it("treats a garbage value as free rather than throwing", () => {
    vi.stubEnv("GEMINI_PRICE_IN_PER_MTOK_CENTS", "not-a-number");

    expect(pricing().inPerMTokCents).toBe(0);

    vi.unstubAllEnvs();
  });
});
