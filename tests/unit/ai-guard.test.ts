import { describe, it, expect, vi, beforeEach } from "vitest";

const evalMock = vi.fn();
const zremMock = vi.fn();

vi.mock("@/lib/limits/redis", () => ({
  redis: () => ({ eval: evalMock, zrem: zremMock }),
}));

import { guardAiRequest } from "@/lib/limits/ai-guard";
import { AI_PER_USER_HOUR, AI_IN_FLIGHT_MAX } from "@/lib/limits/config";

const headers = new Headers({ "x-forwarded-for": "203.0.113.9" });

beforeEach(() => {
  evalMock.mockReset();
  zremMock.mockReset();
});

describe("guardAiRequest", () => {
  it("allows a request that is inside every budget", async () => {
    evalMock
      .mockResolvedValueOnce([1, 19, 0])
      .mockResolvedValueOnce([1, 29, 0])
      .mockResolvedValueOnce(1);

    const guard = await guardAiRequest("user-1", headers);

    expect(guard.ok).toBe(true);
  });

  it("refuses when the per-user hourly budget is spent", async () => {
    evalMock.mockResolvedValueOnce([0, 0, 60_000]);

    const guard = await guardAiRequest("user-1", headers);

    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.response.status).toBe(429);
      expect(guard.response.headers.get("Retry-After")).toBe("60");
    }
  });

  it("refuses when every concurrency slot is taken", async () => {
    evalMock
      .mockResolvedValueOnce([1, 19, 0])
      .mockResolvedValueOnce([1, 29, 0])
      .mockResolvedValueOnce(0);

    const guard = await guardAiRequest("user-1", headers);

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(429);
  });

  it("fails closed when redis is unreachable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    evalMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const guard = await guardAiRequest("user-1", headers);

    expect(guard.ok).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not spend the shared unknown-ip bucket", async () => {
    evalMock.mockResolvedValueOnce([1, 19, 0]).mockResolvedValueOnce(1);

    const guard = await guardAiRequest("user-1", new Headers());

    expect(guard.ok).toBe(true);
    expect(evalMock).toHaveBeenCalledTimes(2);
    expect(evalMock.mock.calls[0][1]).toEqual(["rl:ai:user:user-1"]);
  });

  it("releases the slot when the caller is done", async () => {
    evalMock
      .mockResolvedValueOnce([1, 19, 0])
      .mockResolvedValueOnce([1, 29, 0])
      .mockResolvedValueOnce(1);

    const guard = await guardAiRequest("user-1", headers);

    if (guard.ok) {
      await guard.release();
      expect(zremMock).toHaveBeenCalledWith("cc:ai:in-flight", expect.any(String));
    }
  });

  it("keys the user budget separately from the ip budget", async () => {
    evalMock
      .mockResolvedValueOnce([1, 19, 0])
      .mockResolvedValueOnce([1, 29, 0])
      .mockResolvedValueOnce(1);

    await guardAiRequest("user-1", headers);

    expect(evalMock.mock.calls[0][1]).toEqual(["rl:ai:user:user-1"]);
    expect(evalMock.mock.calls[1][1]).toEqual(["rl:ai:ip:203.0.113.9"]);
  });

  it("uses the configured hourly ceiling", async () => {
    evalMock
      .mockResolvedValueOnce([1, 19, 0])
      .mockResolvedValueOnce([1, 29, 0])
      .mockResolvedValueOnce(1);

    await guardAiRequest("user-1", headers);

    expect(evalMock.mock.calls[0][2][2]).toBe(String(AI_PER_USER_HOUR.limit));
    expect(evalMock.mock.calls[2][2][2]).toBe(String(AI_IN_FLIGHT_MAX));
  });
});
