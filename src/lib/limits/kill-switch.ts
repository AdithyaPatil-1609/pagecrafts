import "server-only";
import { redis } from "@/lib/limits/redis";

const KEY = "ai:kill-switch";

export type KillSwitch = {
  engaged: boolean;
  reason: string | null;
};

const OFF: KillSwitch = { engaged: false, reason: null };

function fromEnv(): KillSwitch | null {
  const flag = process.env.AI_KILL_SWITCH?.trim().toLowerCase();

  if (flag === "1" || flag === "true" || flag === "on") {
    return { engaged: true, reason: process.env.AI_KILL_SWITCH_REASON?.trim() || null };
  }

  return null;
}

export async function killSwitch(): Promise<KillSwitch> {
  const env = fromEnv();

  if (env) return env;

  try {
    const value = await redis().get<string>(KEY);

    if (!value) return OFF;

    return { engaged: true, reason: value === "1" ? null : value };
  } catch (error) {
    console.error("[kill-switch] could not read the flag, treating as off", {
      reason: error instanceof Error ? error.message : String(error),
    });

    return OFF;
  }
}

export async function engage(reason: string): Promise<void> {
  await redis().set(KEY, reason || "1");
}

export async function release(): Promise<void> {
  await redis().del(KEY);
}
