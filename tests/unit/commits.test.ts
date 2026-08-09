import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCommit, listCommits } from "@/lib/data/commits";
import { treeSha } from "@/lib/data/tree-hash";

type Reply = { data: unknown; error: { message: string } | null };

interface Insert {
  table: string;
  rows: Record<string, unknown>;
}

// Minimal stand-in for the Supabase query builder: every chained method returns
// itself and awaiting it yields the next queued reply for that table.
function fakeSupabase(replies: Record<string, Reply[]>) {
  const inserts: Insert[] = [];

  const client = {
    from(table: string) {
      const queue = replies[table] ?? [];
      const reply: Reply = queue.shift() ?? { data: null, error: null };

      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "order", "limit", "maybeSingle", "single"]) {
        builder[method] = () => builder;
      }
      builder.insert = (rows: Record<string, unknown>) => {
        inserts.push({ table, rows });
        return builder;
      };
      builder.then = (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(reply).then(resolve, reject);

      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, inserts };
}

const PROJECT = "11111111-1111-1111-1111-111111111111";
const found = { data: { id: PROJECT }, error: null };
const missing = { data: null, error: null };

describe("listCommits", () => {
  it("returns history newest first in contract shape", async () => {
    const { client } = fakeSupabase({
      projects: [found],
      commits: [
        {
          data: [
            { sha: "a".repeat(40), message: "Second save", author: "user", created_at: "2026-08-08T10:00:00Z" },
            { sha: "b".repeat(40), message: "Created from Aurora", author: "system", created_at: "2026-08-08T09:00:00Z" },
          ],
          error: null,
        },
      ],
    });

    const result = await listCommits(client, PROJECT);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      sha: "a".repeat(40),
      message: "Second save",
      author: "user",
      createdAt: "2026-08-08T10:00:00Z",
    });
  });

  it("reports not_found for a project the caller cannot see", async () => {
    const { client } = fakeSupabase({ projects: [missing] });
    await expect(listCommits(client, PROJECT)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("createCommit", () => {
  const tree = { "index.html": "<h1>hi</h1>" };

  it("writes one commit carrying the tree snapshot", async () => {
    const { client, inserts } = fakeSupabase({
      projects: [found],
      commits: [missing, { data: null, error: null }],
    });

    const result = await createCommit(client, PROJECT, "First save", "user", tree);

    expect(result.sha).toBe(treeSha(tree));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].rows).toMatchObject({
      project_id: PROJECT,
      sha: treeSha(tree),
      message: "First save",
      author: "user",
      snapshot: tree,
    });
  });

  it("reuses the existing sha when nothing changed", async () => {
    const { client, inserts } = fakeSupabase({
      projects: [found],
      commits: [{ data: { sha: treeSha(tree) }, error: null }],
    });

    const result = await createCommit(client, PROJECT, "Save again", "user", tree);

    expect(result.sha).toBe(treeSha(tree));
    expect(inserts).toHaveLength(0);
  });

  it("trims a message past the 500 character column limit", async () => {
    const { client, inserts } = fakeSupabase({
      projects: [found],
      commits: [missing, { data: null, error: null }],
    });

    await createCommit(client, PROJECT, "x".repeat(600), "user", tree);

    expect((inserts[0].rows.message as string).length).toBe(500);
  });
});
