import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCommit } from "@/lib/data/commits";
import { treeSha } from "@/lib/data/tree-hash";

type Reply = { data: unknown; error: { message: string } | null };

interface Write {
  table: string;
  rows: Record<string, unknown>;
}

// Minimal stand-in for the Supabase query builder: every chained method returns itself and
// awaiting it yields the next queued reply for that table.
function fakeSupabase(replies: Record<string, Reply[]>) {
  const writes: Write[] = [];

  const client = {
    from(table: string) {
      const queue = replies[table] ?? [];
      const reply: Reply = queue.shift() ?? { data: null, error: null };

      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "order", "limit", "maybeSingle", "single"]) {
        builder[method] = () => builder;
      }
      for (const method of ["insert", "upsert"]) {
        builder[method] = (rows: Record<string, unknown>) => {
          writes.push({ table, rows });
          return builder;
        };
      }
      builder.then = (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(reply).then(resolve, reject);

      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, writes };
}

const PROJECT = "11111111-1111-1111-1111-111111111111";
const NOW = "2026-08-09T10:00:00.000Z";
const tree = { "index.html": "<h1>hi</h1>" };

function mirrored(message: string) {
  return {
    data: { sha: treeSha(tree), message, author: "user", created_at: NOW },
    error: null,
  };
}

describe("createCommit", () => {
  it("writes one commit carrying the tree snapshot", async () => {
    const { client, writes } = fakeSupabase({
      commits: [{ data: null, error: null }, mirrored("First save")],
    });

    const result = await createCommit(client, PROJECT, "First save", "user", tree);

    expect(result.sha).toBe(treeSha(tree));
    expect(writes).toHaveLength(1);
    expect(writes[0].rows).toMatchObject({
      project_id: PROJECT,
      sha: treeSha(tree),
      message: "First save",
      author: "user",
      snapshot: tree,
    });
  });

  it("reuses the existing sha when nothing changed, and writes nothing", async () => {
    const { client, writes } = fakeSupabase({
      commits: [{ data: { sha: treeSha(tree) }, error: null }],
    });

    const result = await createCommit(client, PROJECT, "Save again", "user", tree);

    expect(result.sha).toBe(treeSha(tree));
    expect(writes).toHaveLength(0);
  });

  it("trims a message past the 500 character column limit", async () => {
    const { client, writes } = fakeSupabase({
      commits: [{ data: null, error: null }, mirrored("x".repeat(500))],
    });

    await createCommit(client, PROJECT, "x".repeat(600), "user", tree);

    expect((writes[0].rows.message as string).length).toBe(500);
  });

  it("records a fork's first commit as the system, not the user", async () => {
    const { client, writes } = fakeSupabase({
      commits: [{ data: null, error: null }, mirrored("Created from Ember")],
    });

    await createCommit(client, PROJECT, "Created from Ember", "system", tree);

    expect(writes[0].rows.author).toBe("system");
  });
});