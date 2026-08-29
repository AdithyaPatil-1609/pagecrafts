import "server-only";
import { redis, isRedisConfigured } from "@/lib/limits/redis";
import type { WindowLimit } from "@/lib/limits/config";

export type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  degraded: boolean;
};

const SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local used = redis.call('ZCARD', key)

if used < limit then
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window)
  return {1, limit - used - 1, 0}
end

local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local resetIn = window

if oldest[2] then
  resetIn = tonumber(oldest[2]) + window - now
  if resetIn < 0 then resetIn = 0 end
end

redis.call('PEXPIRE', key, window)

return {0, 0, resetIn}
`;

function denied(retryAfterSeconds: number, degraded: boolean): LimitResult {
  return { allowed: false, remaining: 0, retryAfterSeconds, degraded };
}

export async function consume(
  bucket: string,
  identifier: string,
  rule: WindowLimit,
): Promise<LimitResult> {
  if (!isRedisConfigured()) {
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0, degraded: false };
  }

  const key = `rl:${bucket}:${identifier}`;
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const raw = await redis().eval(
      SLIDING_WINDOW,
      [key],
      [String(now), String(rule.windowMs), String(rule.limit), member],
    );

    const [allowed, remaining, resetInMs] = raw as [number, number, number];

    if (allowed === 1) {
      return {
        allowed: true,
        remaining: Number(remaining),
        retryAfterSeconds: 0,
        degraded: false,
      };
    }

    return denied(Math.max(1, Math.ceil(Number(resetInMs) / 1000)), false);
  } catch (error) {
    console.error("[rate-limit] redis call failed, denying", {
      bucket,
      reason: error instanceof Error ? error.message : String(error),
    });

    return denied(Math.ceil(rule.windowMs / 1000), true);
  }
}

export async function consumeAll(
  checks: Array<{ bucket: string; identifier: string; rule: WindowLimit }>,
): Promise<LimitResult> {
  for (const check of checks) {
    const result = await consume(check.bucket, check.identifier, check.rule);
    if (!result.allowed) return result;
  }

  return { allowed: true, remaining: 0, retryAfterSeconds: 0, degraded: false };
}
