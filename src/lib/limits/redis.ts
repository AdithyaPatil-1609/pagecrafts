import "server-only";
import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/config/env";

let client: Redis | null = null;

export function redis(): Redis {
  if (client) return client;

  const env = serverEnv();

  client = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return client;
}
