import "server-only";
import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export function redis(): Redis {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    const missing = [
      url ? null : "UPSTASH_REDIS_REST_URL",
      token ? null : "UPSTASH_REDIS_REST_TOKEN",
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(`Rate limiter is not configured. Missing: ${missing}`);
  }

  client = new Redis({ url, token });

  return client;
}
