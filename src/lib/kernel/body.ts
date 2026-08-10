import "server-only";
import { ApiError } from "@/lib/errors/respond";

export const MAX_BODY_BYTES = 64 * 1024;

export function tooLarge(headers: Headers, raw?: string): boolean {
  const declared = Number(headers.get("content-length") ?? 0);

  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return true;

  return raw !== undefined && raw.length > MAX_BODY_BYTES;
}

export async function readJson(req: Request): Promise<unknown> {
  if (tooLarge(req.headers)) {
    throw new ApiError("payload_too_large", "That request is too large.");
  }

  const raw = await req.text().catch(() => "");

  if (tooLarge(req.headers, raw)) {
    throw new ApiError("payload_too_large", "That request is too large.");
  }

  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
