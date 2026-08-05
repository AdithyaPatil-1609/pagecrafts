import "server-only";
import { NextResponse } from "next/server";
import { createOctokit, whoami } from "@/lib/github/octokit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.GITHUB_TEST_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_TOKEN_MISSING" },
      { status: 500 },
    );
  }

  try {
    const client = createOctokit(token);
    const identity = await whoami(client);

    return NextResponse.json({
      ok: true,
      login: identity.login,
      id: String(identity.id),
      scopes: identity.scopes,
      scopeOk:
        identity.scopes.length === 1 && identity.scopes[0] === "public_repo",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "UPSTREAM_GITHUB_ERROR",
        message: (err as Error).message,
      },
      { status: 502 },
    );
  }
}