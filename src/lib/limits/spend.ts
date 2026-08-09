import "server-only";
import { redis } from "@/lib/limits/redis";
import { AI_DAILY_PER_USER, AI_DAILY_GLOBAL, type DailyCap } from "@/lib/limits/config";
import type { Usage } from "@/lib/contracts";

export type SpendVerdict = {
  allowed: boolean;
  scope: "user" | "global" | null;
  reason: "requests" | "cents" | null;
  resetsInSeconds: number;
  degraded: boolean;
};

const ALLOWED: SpendVerdict = {
  allowed: true,
  scope: null,
  reason: null,
  resetsInSeconds: 0,
  degraded: false,
};

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function secondsUntilUtcMidnight(now = new Date()): number {
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );

  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

export function pricing(): { inPerMTokCents: number; outPerMTokCents: number } {
  const read = (name: string) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  return {
    inPerMTokCents: read("GEMINI_PRICE_IN_PER_MTOK_CENTS"),
    outPerMTokCents: read("GEMINI_PRICE_OUT_PER_MTOK_CENTS"),
  };
}

export function costInCents(
  usage: Pick<Usage, "inputTokens" | "outputTokens">,
  inPerMTokCents: number,
  outPerMTokCents: number,
): number {
  const input = (usage.inputTokens / 1_000_000) * inPerMTokCents;
  const output = (usage.outputTokens / 1_000_000) * outPerMTokCents;

  return Math.max(0, Math.round((input + output) * 1_000) / 1_000);
}

function over(used: { requests: number; cents: number }, cap: DailyCap) {
  if (used.requests >= cap.requests) return "requests" as const;
  if (used.cents >= cap.cents) return "cents" as const;
  return null;
}

async function read(key: string): Promise<{ requests: number; cents: number }> {
  const raw = await redis().hgetall<Record<string, string>>(key);

  return {
    requests: Number(raw?.requests ?? 0),
    cents: Number(raw?.cents ?? 0),
  };
}

export async function checkSpend(userId: string, day = utcDay()): Promise<SpendVerdict> {
  try {
    const [user, global] = await Promise.all([
      read(`spend:user:${userId}:${day}`),
      read(`spend:global:${day}`),
    ]);

    const resetsInSeconds = secondsUntilUtcMidnight();

    const globalReason = over(global, AI_DAILY_GLOBAL);
    if (globalReason) {
      return { allowed: false, scope: "global", reason: globalReason, resetsInSeconds, degraded: false };
    }

    const userReason = over(user, AI_DAILY_PER_USER);
    if (userReason) {
      return { allowed: false, scope: "user", reason: userReason, resetsInSeconds, degraded: false };
    }

    return ALLOWED;
  } catch (error) {
    console.error("[spend] could not read the daily counters, refusing", {
      userId,
      reason: error instanceof Error ? error.message : String(error),
    });

    return {
      allowed: false,
      scope: null,
      reason: null,
      resetsInSeconds: secondsUntilUtcMidnight(),
      degraded: true,
    };
  }
}

export async function recordSpend(
  userId: string,
  cents: number,
  day = utcDay(),
): Promise<void> {
  const ttl = secondsUntilUtcMidnight();
  const rounded = Math.max(0, Math.round(cents * 1_000) / 1_000);

  try {
    await Promise.all(
      [`spend:user:${userId}:${day}`, `spend:global:${day}`].map(async (key) => {
        const client = redis();
        await client.hincrby(key, "requests", 1);
        if (rounded > 0) await client.hincrbyfloat(key, "cents", rounded);
        await client.expire(key, ttl);
      }),
    );
  } catch (error) {
    console.error("[spend] could not record usage", {
      userId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
