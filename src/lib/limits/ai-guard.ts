import "server-only";
import { consumeAll } from "@/lib/limits/rate-limit";
import { acquireSlot, type Slot } from "@/lib/limits/concurrency";
import { clientIp, UNKNOWN_IP } from "@/lib/limits/client-ip";
import { AI_PER_USER_HOUR, AI_PER_IP_HOUR } from "@/lib/limits/config";
import { fail } from "@/lib/errors/respond";

const THROTTLED = "You have made a lot of requests. Try again in a little while.";
const BUSY = "We are handling a lot of requests right now. Try again in a moment.";

export type AiGuard =
  | { ok: true; release: () => Promise<void> }
  | { ok: false; response: Response };

function withRetryAfter(response: Response, seconds: number): Response {
  response.headers.set("Retry-After", String(Math.max(1, seconds)));
  return response;
}

export async function guardAiRequest(
  userId: string,
  headers: Headers,
): Promise<AiGuard> {
  const ip = clientIp(headers);

  const checks = [
    { bucket: "ai:user", identifier: userId, rule: AI_PER_USER_HOUR },
  ];

  if (ip !== UNKNOWN_IP) {
    checks.push({ bucket: "ai:ip", identifier: ip, rule: AI_PER_IP_HOUR });
  }

  const budget = await consumeAll(checks);

  if (!budget.allowed) {
    if (budget.degraded) {
      console.error("[ai-guard] rate limiter unavailable, refusing request", { userId });
    }

    return {
      ok: false,
      response: withRetryAfter(fail("rate_limited", THROTTLED), budget.retryAfterSeconds),
    };
  }

  const slot: Slot = await acquireSlot("ai:in-flight");

  if (!slot.acquired) {
    if (slot.degraded) {
      console.error("[ai-guard] concurrency guard unavailable, refusing request", { userId });
    }

    return {
      ok: false,
      response: withRetryAfter(fail("rate_limited", BUSY), 5),
    };
  }

  return { ok: true, release: slot.release };
}
