import { NextResponse } from "next/server";
import type { ApiResult, ErrorCode } from "@/lib/contracts";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  rate_limited: 429,
  spend_capped: 429,
  validation_failed: 422,
  generation_failed: 502,
  github_not_connected: 409,
  github_error: 502,
  internal: 500,
};

export function ok<T>(data: T, status = 200): NextResponse<ApiResult<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(
  code: ErrorCode,
  message: string,
  detail?: string,
): NextResponse<ApiResult<never>> {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(detail ? { detail } : {}) } },
    { status: STATUS_BY_CODE[code] },
  );
}

export function unexpected(error: unknown): NextResponse<ApiResult<never>> {
  const detail = error instanceof Error ? error.message : undefined;
  return fail("internal", "Something went wrong. Please try again.", detail);
}
