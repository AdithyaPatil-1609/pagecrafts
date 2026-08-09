import "server-only";

export const UNKNOWN_IP = "unknown";
const UNKNOWN = UNKNOWN_IP;

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return UNKNOWN;
}
