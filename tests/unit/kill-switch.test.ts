import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const get = vi.fn();
const set = vi.fn();
const del = vi.fn();

vi.mock("@/lib/limits/redis", () => ({
  redis: () => ({ get, set, del }),
}));

import { killSwitch, engage, release } from "@/lib/limits/kill-switch";

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("killSwitch", () => {
  it("is off when nothing is set", async () => {
    expect(await killSwitch()).toEqual({ engaged: false, reason: null });
  });

  it("is on when the redis flag is present, and carries the reason", async () => {
    get.mockResolvedValue("provider outage");

    expect(await killSwitch()).toEqual({ engaged: true, reason: "provider outage" });
  });

  it("treats a bare 1 as engaged with no reason", async () => {
    get.mockResolvedValue("1");

    expect(await killSwitch()).toEqual({ engaged: true, reason: null });
  });

  it("honours the env var without touching redis, so it works when redis is the problem", async () => {
    vi.stubEnv("AI_KILL_SWITCH", "true");

    expect((await killSwitch()).engaged).toBe(true);
    expect(get).not.toHaveBeenCalled();
  });

  it("accepts 1, true and on", async () => {
    for (const value of ["1", "true", "on", "ON", " True "]) {
      vi.stubEnv("AI_KILL_SWITCH", value);
      expect((await killSwitch()).engaged).toBe(true);
    }
  });

  it("ignores anything else in the env var", async () => {
    vi.stubEnv("AI_KILL_SWITCH", "no");

    expect((await killSwitch()).engaged).toBe(false);
  });

  it("stays OFF when redis is unreachable, so an outage cannot pause generation by accident", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    get.mockRejectedValue(new Error("ECONNREFUSED"));

    expect((await killSwitch()).engaged).toBe(false);

    spy.mockRestore();
  });
});

describe("engage and release", () => {
  it("stores the reason", async () => {
    await engage("gemini bill spiked");
    expect(set).toHaveBeenCalledWith("ai:kill-switch", "gemini bill spiked");
  });

  it("falls back to 1 when no reason is given", async () => {
    await engage("");
    expect(set).toHaveBeenCalledWith("ai:kill-switch", "1");
  });

  it("clears the flag", async () => {
    await release();
    expect(del).toHaveBeenCalledWith("ai:kill-switch");
  });
});
