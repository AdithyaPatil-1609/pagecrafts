import { describe, expect, it, vi, beforeEach } from "vitest";

const evalMock = vi.fn();

vi.mock("@/lib/limits/redis", () => ({
  redis: () => ({ eval: evalMock }),
}));

import { consume, consumeAll } from "@/lib/limits/rate-limit";
import { clientIp } from "@/lib/limits/client-ip";
import { LOGIN_PER_IP, LOGIN_PER_EMAIL } from "@/lib/limits/config";

beforeEach(() => {
  evalMock.mockReset();
});

describe("consume", () => {
  it("allows a request when the window has room", async () => {
    evalMock.mockResolvedValue([1, 9, 0]);

    const result = await consume("login:ip", "1.2.3.4", LOGIN_PER_IP);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.degraded).toBe(false);
  });

  it("denies once the window is full and reports when to retry", async () => {
    evalMock.mockResolvedValue([0, 0, 42_000]);

    const result = await consume("login:ip", "1.2.3.4", LOGIN_PER_IP);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(42);
    expect(result.degraded).toBe(false);
  });

  it("fails closed when redis is unreachable", async () => {
    evalMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await consume("login:ip", "1.2.3.4", LOGIN_PER_IP);

    expect(result.allowed).toBe(false);
    expect(result.degraded).toBe(true);
  });

  it("scopes the redis key by bucket and identifier", async () => {
    evalMock.mockResolvedValue([1, 4, 0]);

    await consume("login:email", "kedar@example.com", LOGIN_PER_EMAIL);

    expect(evalMock.mock.calls[0][1]).toEqual(["rl:login:email:kedar@example.com"]);
  });
});

describe("consumeAll", () => {
  it("stops at the first denial and does not spend later budgets", async () => {
    evalMock.mockResolvedValueOnce([0, 0, 1_000]);

    const result = await consumeAll([
      { bucket: "login:ip", identifier: "1.2.3.4", rule: LOGIN_PER_IP },
      { bucket: "login:email", identifier: "a@b.com", rule: LOGIN_PER_EMAIL },
    ]);

    expect(result.allowed).toBe(false);
    expect(evalMock).toHaveBeenCalledTimes(1);
  });

  it("allows when every check passes", async () => {
    evalMock.mockResolvedValue([1, 3, 0]);

    const result = await consumeAll([
      { bucket: "login:ip", identifier: "1.2.3.4", rule: LOGIN_PER_IP },
      { bucket: "login:email", identifier: "a@b.com", rule: LOGIN_PER_EMAIL },
    ]);

    expect(result.allowed).toBe(true);
    expect(evalMock).toHaveBeenCalledTimes(2);
  });
});

describe("clientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 70.41.3.18" });
    expect(clientIp(headers)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("returns a stable placeholder when no header is present", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
