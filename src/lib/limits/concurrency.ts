import "server-only";
import { redis } from "@/lib/limits/redis";
import { AI_IN_FLIGHT_MAX, AI_IN_FLIGHT_TTL_MS } from "@/lib/limits/config";

export type Slot = {
  acquired: boolean;
  release: () => Promise<void>;
  degraded: boolean;
};

const ACQUIRE = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - ttl)

if redis.call('ZCARD', key) >= max then
  return 0
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, ttl)

return 1
`;

const NOOP = async () => {};

export async function acquireSlot(bucket: string): Promise<Slot> {
  const key = `cc:${bucket}`;
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const granted = await redis().eval(
      ACQUIRE,
      [key],
      [String(now), String(AI_IN_FLIGHT_TTL_MS), String(AI_IN_FLIGHT_MAX), member],
    );

    if (Number(granted) !== 1) {
      return { acquired: false, release: NOOP, degraded: false };
    }

    return {
      acquired: true,
      degraded: false,
      release: async () => {
        try {
          await redis().zrem(key, member);
        } catch {
          return;
        }
      },
    };
  } catch {
    return { acquired: false, release: NOOP, degraded: true };
  }
}
