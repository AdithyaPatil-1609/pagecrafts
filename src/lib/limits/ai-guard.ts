import "server-only";
import { consumeAll } from "@/lib/limits/rate-limit";
import { acquireSlot, type Slot } from "@/lib/limits/concurrency";
import { clientIp, UNKNOWN_IP } from "@/lib/limits/client-ip";
import { AI_PER_USER_HOUR, AI_PER_IP_HOUR } from "@/lib/limits/config";
import { fail } from "@/lib/errors/respond";
import { killSwitch } from "@/lib/limits/kill-switch";
import { checkSpend, recordSpend, costInCents } from "@/lib/limits/spend";
import { aiConfig } from "@/lib/ai/config";
import type { Usage } from "@/lib/contracts";

const THROTTLED = "You have made a lot of requests. Try again in a little while.";
const BUSY = "We are handling a lot of requests right now. Try again in a moment.";
const PAUSED = "Site generation is paused right now. Please try again later.";
const USER_CAP = "You have reached today's generation limit. It resets at midnight UTC.";
const GLOBAL_CAP = "Generation has reached today's limit across PageCraft. It resets at midnight UTC.";

export type UsageReport = Pick<Usage, "inputTokens" | "outputTokens">;

export type AiGuard =
  | { ok: true; release: () => Promise<void>; recordUsage: (usage: UsageReport) => Promise<void> }
  | { ok: false; response: Response };

function withRetryAfter(response: Response, seconds: number): Response {
  response.headers.set("Retry-After", String(Math.max(1, seconds)));
  return response;
}

export async function guardAiRequest(
  userId: string,
  headers: Headers,
): Promise<AiGuard> {
  const paused = await killSwitch();

  if (paused.engaged) {
    console.error("[ai-guard] kill switch engaged, refusing request", {
      userId,
      reason: paused.reason,
    });

    return { ok: false, response: fail("generation_failed", PAUSED, paused.reason ?? undefined) };
  }

  const spend = await checkSpend(userId);

  if (!spend.allowed) {
    const response = fail(
      "spend_capped",
      spend.scope === "global" ? GLOBAL_CAP : USER_CAP,
    );
    response.headers.set("Retry-After", String(spend.resetsInSeconds));

    return { ok: false, response };
  }

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

  return {
    ok: true,
    release: slot.release,
    recordUsage: async (usage: UsageReport) => {
      const { inPerMTokCents, outPerMTokCents } = aiConfig().pricing;
      await recordSpend(userId, costInCents(usage, inPerMTokCents, outPerMTokCents));
    },
  };
}
