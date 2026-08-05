import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { createProjectSchema } from "@/lib/contracts/schemas";
import { createProject, listProjects } from "@/lib/data/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBody = z.infer<typeof createProjectSchema>;

// GET /api/v1/projects — the dashboard list (owner-scoped).
export const GET = withRoute({
  handler: async ({ supabase, userId }) => {
    const items = await listProjects(supabase, userId);
    return ok({ items });
  },
});

// POST /api/v1/projects — create a project (fork/generate wiring lands in later days).
export const POST = withRoute<CreateBody>({
  schema: createProjectSchema,
  handler: async ({ supabase, userId, body }) => {
    const result = await createProject(supabase, userId, body);
    return ok(result, 201);
  },
});
