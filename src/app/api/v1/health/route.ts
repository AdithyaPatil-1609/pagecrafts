import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/data/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = {
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
};

async function run(name: string, fn: () => Promise<void>): Promise<Check> {
  const started = Date.now();

  try {
    await fn();
    return { name, ok: true, ms: Date.now() - started };
  } catch (error) {
    return {
      name,
      ok: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : "unknown failure",
    };
  }
}

export async function GET() {
  const checks = await Promise.all([
    run("supabase", async () => {
      const { error } = await supabaseAdmin().from("templates").select("id").limit(1);
      if (error) throw new Error(error.message);
    }),
  ]);

  const ok = checks.every((check) => check.ok);

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
