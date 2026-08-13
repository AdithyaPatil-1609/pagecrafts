import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_STATUS } from "@/lib/errors/codes";
import { responseSchema, spec, validate } from "../support/openapi";
import {
    dbError,
    fakeSupabase,
    none,
    row,
    rows,
    type RpcResponder,
    type TableResponder,
} from "../support/fake-supabase";

// Contract tests for the persistence surface (R3 D4).
//
// Every one of these drives the real route handler and holds its response to the schema
// docs/openapi.yaml declares for that operation — success envelopes, the failure envelope,
// and the status codes in between. The spec is described in contracts.md as the canonical
// HTTP contract; this is what makes that sentence true rather than aspirational.
//
// Three behaviours are checked for every route that can exhibit them:
//
//   404 — a project or file that is not visible. RLS does not raise on someone else's row,
//         it returns nothing, so "no rows" MUST become not_found and never an empty
//         success. That is the whole of owner-scoping at the API edge (SEC-14).
//   422 — a body or path the contract refuses, with nothing written.
//   the envelope — no route may answer with a bare 500 or an undocumented shape (N-4).

const auth = vi.hoisted(() => ({ requireUser: vi.fn(), supabaseRoute: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({
    requireUser: auth.requireUser,
    supabaseRoute: auth.supabaseRoute,
}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-08-08T10:00:00.000Z";

const projectRow = {
    id: PROJECT_ID,
    name: "Kettle & Co.",
    source_template_id: TEMPLATE_ID,
    content_json: { hero: { headline: "Coffee worth walking for." } },
    site_meta: {},
    form_endpoint: null,
    updated_at: NOW,
    deployments: [],
};

// Wires the mocked session to a fake database and returns the recorded queries.
function withTables(
    tables: Record<string, TableResponder>,
    functions: Record<string, RpcResponder> = {},
) {
    const fake = fakeSupabase(tables, functions);
    auth.requireUser.mockResolvedValue({ userId: "u_1", supabase: fake.client });
    auth.supabaseRoute.mockResolvedValue(fake.client);
    return fake;
}

const request = (url: string, init?: RequestInit) =>
    new Request(`http://localhost${url}`, init) as never;

const json = (body: unknown) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
});

/** Assert a response matches what the spec says that operation answers with. */
async function expectMatchesSpec(
    response: Response,
    path: string,
    method: string,
    status: number,
) {
    const body = await response.json();
    expect(response.status, `${method} ${path} status`).toBe(status);
    expect(validate(responseSchema(path, method, status), body)).toEqual([]);
    return body;
}

/** Assert a failure answers with the documented envelope, code and status. */
async function expectApiError(response: Response, path: string, method: string, code: string) {
    const body = await response.json();

    expect(validate(responseSchema(path, method, "default"), body)).toEqual([]);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe(code);
    expect(response.status).toBe(ERROR_STATUS[code as keyof typeof ERROR_STATUS]);
    // The message reaches a person eventually; it is never allowed to be empty.
    expect(String(body.error.message).trim()).not.toBe("");
    return body;
}

beforeEach(() => {
    vi.clearAllMocks();
});

// A checker that passes everything would make every test below meaningless, so it is held
// to known-bad payloads first.
describe("the contract checker itself", () => {
    const commitList = { $ref: "#/components/schemas/CommitListResult" };
    const good = {
        ok: true,
        data: { items: [{ sha: "a1b2c3d", message: "Save", author: "user", createdAt: NOW }] },
    };

    it("passes a conforming body", () => {
        expect(validate(commitList, good)).toEqual([]);
    });

    it("catches a missing required property", () => {
        const body = { ok: true, data: { items: [{ sha: "a1b2c3d", author: "user", createdAt: NOW }] } };
        expect(validate(commitList, body).join(" ")).toContain('missing required property "message"');
    });

    it("catches a wrong type", () => {
        const body = { ok: true, data: { items: [{ ...good.data.items[0], message: 7 }] } };
        expect(validate(commitList, body).join(" ")).toContain("expected string");
    });

    it("catches a value outside a documented enum", () => {
        const body = { ok: true, data: { items: [{ ...good.data.items[0], author: "robot" }] } };
        expect(validate(commitList, body).join(" ")).toContain("is not one of");
    });

    it("catches a string that breaks the documented pattern", () => {
        const body = { ok: true, data: { items: [{ ...good.data.items[0], sha: "not-a-sha" }] } };
        expect(validate(commitList, body).join(" ")).toContain("does not match");
    });

    it("catches a property no integrator has been told about", () => {
        const body = { ok: true, data: { items: [{ ...good.data.items[0], secret: "x" }] } };
        expect(validate(commitList, body).join(" ")).toContain('"secret" is not in the spec');
    });

    it("merges allOf rather than letting each half reject the other's properties", () => {
        const detail = { $ref: "#/components/schemas/ProjectDetailResult" };
        const body = {
            ok: true,
            data: {
                id: PROJECT_ID,
                name: "Kettle & Co.",
                status: "draft",
                liveUrl: null,
                thumbnailUrl: null,
                updatedAt: NOW,
                sourceTemplateId: null,
                contentJson: {},
                // Empty rather than absent: a generated project has no schema, but the
                // field is still part of the shape every integrator is handed (R2 D8).
                contentSchema: { sections: [] },
                siteMeta: {},
                formEndpoint: null,
            },
        };
        expect(validate(detail, body)).toEqual([]);
    });
});

describe("the spec and the frozen error codes agree", () => {
    it("documents exactly the ErrorCode set the code can emit", () => {
        const documented = spec.components.schemas.Error!.properties!.code!.enum as string[];
        expect([...documented].sort()).toEqual(Object.keys(ERROR_STATUS).sort());
    });

    it("documents every persistence route this track owns", () => {
        for (const path of [
            "/projects",
            "/projects/{projectId}",
            "/projects/{projectId}/files",
            "/projects/{projectId}/files/{path}",
            "/projects/{projectId}/content",
            "/projects/{projectId}/assets",
            "/projects/{projectId}/commits",
            "/projects/{projectId}/restore",
        ]) {
            expect(spec.paths[path], `${path} is undocumented`).toBeDefined();
        }
    });
});

describe("GET /projects", () => {
    const path = "/projects";

    it("answers with the documented list envelope", async () => {
        withTables({ projects: rows([{ ...projectRow, deployments: [] }]) });
        const { GET } = await import("@/app/api/v1/projects/route");

        const body = await expectMatchesSpec(await GET(request("/api/v1/projects")), path, "get", 200);
        expect(body.data.items).toHaveLength(1);
        // No deployment yet is "draft", not a missing field.
        expect(body.data.items[0].status).toBe("draft");
    });

    it("answers with an empty list, not an error, when the owner has no sites", async () => {
        withTables({ projects: rows([]) });
        const { GET } = await import("@/app/api/v1/projects/route");

        const body = await expectMatchesSpec(await GET(request("/api/v1/projects")), path, "get", 200);
        expect(body.data.items).toEqual([]);
    });

    it("turns a database failure into the envelope, never a bare 500", async () => {
        withTables({ projects: dbError("connection reset") });
        const { GET } = await import("@/app/api/v1/projects/route");

        await expectApiError(await GET(request("/api/v1/projects")), path, "get", "internal");
    });

    it("refuses an unauthenticated caller with the documented 401", async () => {
        const { ApiError } = await import("@/lib/errors/respond");
        auth.requireUser.mockRejectedValue(new ApiError("unauthorized", "Please sign in."));
        const { GET } = await import("@/app/api/v1/projects/route");

        await expectApiError(await GET(request("/api/v1/projects")), path, "get", "unauthorized");
    });
});

describe("POST /projects", () => {
    const path = "/projects";

    it("creates a project and answers 201 with the documented shape", async () => {
        withTables({ projects: row({ id: PROJECT_ID }) });
        const { POST } = await import("@/app/api/v1/projects/route");

        const body = await expectMatchesSpec(
            await POST(request("/api/v1/projects", json({ name: "Kettle & Co." }))),
            path,
            "post",
            201,
        );
        expect(body.data.id).toBe(PROJECT_ID);
    });

    it("refuses a body the contract does not allow (422)", async () => {
        withTables({ projects: row({ id: PROJECT_ID }) });
        const { POST } = await import("@/app/api/v1/projects/route");

        // name is required and capped at 80 characters.
        await expectApiError(
            await POST(request("/api/v1/projects", json({ name: "" }))),
            path,
            "post",
            "validation_failed",
        );
        await expectApiError(
            await POST(request("/api/v1/projects", json({ name: "x".repeat(81) }))),
            path,
            "post",
            "validation_failed",
        );
    });

    it("writes nothing when the body is refused", async () => {
        const fake = withTables({ projects: row({ id: PROJECT_ID }) });
        const { POST } = await import("@/app/api/v1/projects/route");

        await POST(request("/api/v1/projects", json({})));
        expect(fake.queries).toEqual([]);
    });
});

describe("GET /projects/{projectId}", () => {
    const path = "/projects/{projectId}";
    const params = { params: Promise.resolve({ id: PROJECT_ID }) };

    it("answers with the documented detail envelope", async () => {
        withTables({ projects: row(projectRow) });
        const { GET } = await import("@/app/api/v1/projects/[id]/route");

        const body = await expectMatchesSpec(
            await GET(request(`/api/v1/projects/${PROJECT_ID}`), params as never),
            path,
            "get",
            200,
        );
        expect(body.data.sourceTemplateId).toBe(TEMPLATE_ID);
    });

    it("returns not_found for a project RLS does not show this caller", async () => {
        withTables({ projects: none });
        const { GET } = await import("@/app/api/v1/projects/[id]/route");

        await expectApiError(
            await GET(request(`/api/v1/projects/${PROJECT_ID}`), params as never),
            path,
            "get",
            "not_found",
        );
    });
});

describe("GET /projects/{projectId}/files/{path}", () => {
    const path = "/projects/{projectId}/files/{path}";
    const params = { params: Promise.resolve({ id: PROJECT_ID, path: ["index.html"] }) };

    it("answers with the documented single-file envelope", async () => {
        withTables({
            projects: row({ id: PROJECT_ID, updated_at: NOW }),
            project_files: row({ path: "index.html", content: "<h1>hi</h1>", updated_at: NOW }),
        });
        const { GET } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        const body = await expectMatchesSpec(
            await GET(request("/api/v1/projects/x/files/index.html"), params as never),
            path,
            "get",
            200,
        );
        expect(body.data.content).toBe("<h1>hi</h1>");
    });

    it("distinguishes an absent file from an empty one (404, not empty content)", async () => {
        withTables({ projects: row({ id: PROJECT_ID, updated_at: NOW }), project_files: none });
        const { GET } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        await expectApiError(
            await GET(request("/api/v1/projects/x/files/missing.html"), params as never),
            path,
            "get",
            "not_found",
        );
    });

    it("rebuilds a nested path from the catch-all segments", async () => {
        const fake = withTables({
            projects: row({ id: PROJECT_ID, updated_at: NOW }),
            project_files: row({ path: "sections/hero.html", content: "x", updated_at: NOW }),
        });
        const { GET } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        await GET(request("/api/v1/projects/x/files/sections/hero.html"), {
            params: Promise.resolve({ id: PROJECT_ID, path: ["sections", "hero.html"] }),
        } as never);

        expect(fake.queries.some((q) => q.filters.path === "sections/hero.html")).toBe(true);
    });
});

describe("PUT /projects/{projectId}/files/{path}", () => {
    const path = "/projects/{projectId}/files/{path}";
    const params = { params: Promise.resolve({ id: PROJECT_ID, path: ["index.html"] }) };
    const put = (body: unknown) =>
        request("/api/v1/projects/x/files/index.html", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });

    it("writes the file and reports the tree dirty without committing (V-4)", async () => {
        const fake = withTables({
            projects: row({ id: PROJECT_ID, updated_at: NOW }),
            project_files: row({ path: "index.html" }),
        });
        const { PUT } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        const body = await expectMatchesSpec(
            await PUT(put({ content: "<h1>new</h1>" }), params as never),
            path,
            "put",
            200,
        );

        expect(body.data.dirty).toBe(true);
        // A write must not touch the commit mirror: committing is a separate, explicit act.
        expect(fake.queries.some((q) => q.table === "commits")).toBe(false);
    });

    it("refuses a traversal path with 422 and writes nothing (C-02)", async () => {
        const fake = withTables({ projects: row({ id: PROJECT_ID, updated_at: NOW }) });
        const { PUT } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        await expectApiError(
            await PUT(put({ content: "x" }), {
                params: Promise.resolve({ id: PROJECT_ID, path: ["..", "outside.html"] }),
            } as never),
            path,
            "put",
            "validation_failed",
        );
        expect(fake.queries.filter((q) => q.table === "project_files")).toEqual([]);
    });

    it("refuses a body that is not the documented shape (422)", async () => {
        withTables({ projects: row({ id: PROJECT_ID, updated_at: NOW }) });
        const { PUT } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        await expectApiError(await PUT(put({ content: 7 }), params as never), path, "put", "validation_failed");
        await expectApiError(await PUT(put({}), params as never), path, "put", "validation_failed");
    });

    it("returns not_found when the project is not this caller's", async () => {
        withTables({ projects: none });
        const { PUT } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        await expectApiError(
            await PUT(put({ content: "x" }), params as never),
            path,
            "put",
            "not_found",
        );
    });

    it("translates the per-project file limit into 422, not a 500", async () => {
        withTables({
            projects: row({ id: PROJECT_ID, updated_at: NOW }),
            project_files: dbError("file limit exceeded for project"),
        });
        const { PUT } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        await expectApiError(
            await PUT(put({ content: "x" }), params as never),
            path,
            "put",
            "validation_failed",
        );
    });
});

describe("DELETE /projects/{projectId}/files/{path}", () => {
    const path = "/projects/{projectId}/files/{path}";
    const params = { params: Promise.resolve({ id: PROJECT_ID, path: ["index.html"] }) };
    const del = () => request("/api/v1/projects/x/files/index.html", { method: "DELETE" });

    it("answers with the documented write envelope", async () => {
        withTables({
            projects: row({ id: PROJECT_ID, updated_at: NOW }),
            project_files: rows([{ path: "index.html" }]),
        });
        const { DELETE } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        await expectMatchesSpec(await DELETE(del(), params as never), path, "delete", 200);
    });

    it("returns not_found when the path was not in the project", async () => {
        withTables({ projects: row({ id: PROJECT_ID, updated_at: NOW }), project_files: rows([]) });
        const { DELETE } = await import("@/app/api/v1/projects/[id]/files/[...path]/route");

        await expectApiError(await DELETE(del(), params as never), path, "delete", "not_found");
    });
});

describe("PATCH /projects/{projectId}/content", () => {
    const path = "/projects/{projectId}/content";
    const params = { params: Promise.resolve({ id: PROJECT_ID }) };
    const patch = (body: unknown) =>
        request(`/api/v1/projects/${PROJECT_ID}/content`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });

    const contentSchema = {
        sections: [
            {
                key: "hero",
                label: "Hero",
                fields: [{ key: "headline", label: "Headline", type: "text", maxLength: 60 }],
            },
        ],
    };

    it("applies ops and answers with the documented shape", async () => {
        withTables({
            projects: row(projectRow),
            templates: row({ content_schema: contentSchema }),
        });
        const { PATCH } = await import("@/app/api/v1/projects/[id]/content/route");

        const body = await expectMatchesSpec(
            await PATCH(patch({ ops: [{ path: "hero.headline", value: "New" }] }), params as never),
            path,
            "patch",
            200,
        );
        expect(body.data).toEqual({ rendered: true, dirty: true });
    });

    it("refuses an op against a field the content_schema does not have (422)", async () => {
        withTables({
            projects: row(projectRow),
            templates: row({ content_schema: contentSchema }),
        });
        const { PATCH } = await import("@/app/api/v1/projects/[id]/content/route");

        await expectApiError(
            await PATCH(patch({ ops: [{ path: "hero.nope", value: "x" }] }), params as never),
            path,
            "patch",
            "validation_failed",
        );
    });

    it("refuses an empty op list before it reaches the database (422)", async () => {
        const fake = withTables({ projects: row(projectRow) });
        const { PATCH } = await import("@/app/api/v1/projects/[id]/content/route");

        await expectApiError(await PATCH(patch({ ops: [] }), params as never), path, "patch", "validation_failed");
        expect(fake.queries).toEqual([]);
    });

    it("returns not_found for a project RLS does not show this caller", async () => {
        withTables({ projects: none });
        const { PATCH } = await import("@/app/api/v1/projects/[id]/content/route");

        await expectApiError(
            await PATCH(patch({ ops: [{ path: "hero.headline", value: "x" }] }), params as never),
            path,
            "patch",
            "not_found",
        );
    });
});

describe("GET /projects/{projectId}/commits", () => {
    const path = "/projects/{projectId}/commits";
    const params = { params: Promise.resolve({ id: PROJECT_ID }) };
    const get = () => request(`/api/v1/projects/${PROJECT_ID}/commits`);

    const commitRow = {
        sha: "a1b2c3d4e5f6789012345678901234567890abcd",
        message: "Publish Kettle & Co.",
        author: "user",
        created_at: NOW,
    };

    it("answers with the documented history envelope", async () => {
        withTables({ projects: row({ id: PROJECT_ID }), commits: rows([commitRow]) });
        const { GET } = await import("@/app/api/v1/projects/[id]/commits/route");

        const body = await expectMatchesSpec(await GET(get(), params as never), path, "get", 200);
        expect(body.data.items[0]).toEqual({
            sha: commitRow.sha,
            message: commitRow.message,
            author: "user",
            createdAt: NOW,
        });
    });

    it("reads history from the mirror and never from the project's files", async () => {
        const fake = withTables({ projects: row({ id: PROJECT_ID }), commits: rows([commitRow]) });
        const { GET } = await import("@/app/api/v1/projects/[id]/commits/route");

        await GET(get(), params as never);
        expect(fake.queries.map((q) => q.table)).toEqual(["projects", "commits"]);
    });

    it("answers with an empty history for a project that has never been committed", async () => {
        withTables({ projects: row({ id: PROJECT_ID }), commits: rows([]) });
        const { GET } = await import("@/app/api/v1/projects/[id]/commits/route");

        const body = await expectMatchesSpec(await GET(get(), params as never), path, "get", 200);
        expect(body.data.items).toEqual([]);
    });

    it("separates 'no commits yet' from 'not your project' (404)", async () => {
        withTables({ projects: none, commits: rows([commitRow]) });
        const { GET } = await import("@/app/api/v1/projects/[id]/commits/route");

        await expectApiError(await GET(get(), params as never), path, "get", "not_found");
    });
});

describe("POST /projects/{projectId}/commits", () => {
    const path = "/projects/{projectId}/commits";
    const params = { params: Promise.resolve({ id: PROJECT_ID }) };
    const post = (body: unknown) => request(`/api/v1/projects/${PROJECT_ID}/commits`, json(body));

    const TREE = { "index.html": "<h1>Kettle</h1>" };

    // The working tree read back by createCommit, and the row the mirror hands back after
    // writing. The sha is whatever this tree hashes to — the point of a content-addressed
    // id is that the test does not get to choose it.
    function savedTables(existing: unknown = null) {
        return {
            projects: row({ id: PROJECT_ID, updated_at: NOW }),
            project_files: rows([{ path: "index.html", content: TREE["index.html"] }]),
            commits: ((): TableResponder => {
                return (query) =>
                    query.op === "upsert"
                        ? { data: { sha: "a".repeat(40), message: "m", author: "user", created_at: NOW }, error: null }
                        : { data: existing, error: null };
            })(),
        };
    }

    it("answers 201 with the documented save-point envelope", async () => {
        withTables(savedTables());
        const { POST } = await import("@/app/api/v1/projects/[id]/commits/route");

        const body = await expectMatchesSpec(
            await POST(post({ message: "Save the hero" }), params as never),
            path,
            "post",
            201,
        );
        expect(body.data.sha).toMatch(/^[0-9a-f]{40}$/);
    });

    it("commits the stored tree, not a tree the caller supplied", async () => {
        const fake = withTables(savedTables());
        const { POST } = await import("@/app/api/v1/projects/[id]/commits/route");

        await POST(post({ message: "Save the hero" }), params as never);

        const written = fake.queries.find((q) => q.table === "commits" && q.op === "upsert");
        expect((written?.payload as { snapshot: unknown }).snapshot).toEqual(TREE);
    });

    it("refuses a message the column could not hold (422)", async () => {
        withTables(savedTables());
        const { POST } = await import("@/app/api/v1/projects/[id]/commits/route");

        await expectApiError(
            await POST(post({ message: "" }), params as never),
            path,
            "post",
            "validation_failed",
        );
        await expectApiError(
            await POST(post({ message: "x".repeat(501) }), params as never),
            path,
            "post",
            "validation_failed",
        );
    });

    it("cannot save a point on someone else's project (404)", async () => {
        withTables({ projects: none, project_files: none, commits: none });
        const { POST } = await import("@/app/api/v1/projects/[id]/commits/route");

        await expectApiError(
            await POST(post({ message: "Save the hero" }), params as never),
            path,
            "post",
            "not_found",
        );
    });
});

describe("POST /projects/{projectId}/restore", () => {
    const path = "/projects/{projectId}/restore";
    const params = { params: Promise.resolve({ id: PROJECT_ID }) };
    const post = (body: unknown) => request(`/api/v1/projects/${PROJECT_ID}/restore`, json(body));

    const TREE = { "index.html": "<h1>Monday</h1>" };

    // Built the same way the route will read it back, so the sha and the snapshot agree.
    async function shaOf(tree: Record<string, string>) {
        const { treeSha } = await import("@/lib/data/tree-hash");
        return treeSha(tree);
    }

    function versionTables(snapshot: unknown | undefined): Record<string, TableResponder> {
        let reads = 0;

        return {
            projects: row({ id: PROJECT_ID, updated_at: NOW }),
            commits: (query) => {
                if (query.op === "upsert") {
                    return { data: { sha: "a".repeat(40), message: "m", author: "system", created_at: NOW }, error: null };
                }
                reads += 1;
                // The snapshot read, then the "does this sha already exist" check.
                return reads === 1
                    ? { data: snapshot === undefined ? null : { snapshot }, error: null }
                    : { data: null, error: null };
            },
        };
    }

    const writesTheTree = { replace_project_files: () => ({ data: NOW, error: null }) };

    it("answers 200 with the documented restore envelope", async () => {
        const sha = await shaOf(TREE);
        const fake = withTables(versionTables(TREE), writesTheTree);
        const { POST } = await import("@/app/api/v1/projects/[id]/restore/route");

        const body = await expectMatchesSpec(
            await POST(post({ sha }), params as never),
            path,
            "post",
            200,
        );
        expect(body.data.newSha).toBe(sha);
        expect(fake.rpcs[0]?.args.p_files).toEqual(TREE);
    });

    it("refuses a sha the commits column could never hold (422), and writes nothing", async () => {
        const fake = withTables(versionTables(TREE), writesTheTree);
        const { POST } = await import("@/app/api/v1/projects/[id]/restore/route");

        await expectApiError(
            await POST(post({ sha: "not-a-sha" }), params as never),
            path,
            "post",
            "validation_failed",
        );
        expect(fake.rpcs).toEqual([]);
    });

    it("cannot restore a version it cannot see (404), and writes nothing", async () => {
        const sha = await shaOf(TREE);
        const fake = withTables(versionTables(undefined), writesTheTree);
        const { POST } = await import("@/app/api/v1/projects/[id]/restore/route");

        await expectApiError(await POST(post({ sha }), params as never), path, "post", "not_found");
        expect(fake.rpcs).toEqual([]);
    });

    it("refuses a version saved before file history existed (422), and writes nothing", async () => {
        const sha = await shaOf(TREE);
        const fake = withTables(versionTables(null), writesTheTree);
        const { POST } = await import("@/app/api/v1/projects/[id]/restore/route");

        await expectApiError(
            await POST(post({ sha }), params as never),
            path,
            "post",
            "validation_failed",
        );
        expect(fake.rpcs).toEqual([]);
    });
});

describe("POST /projects/{projectId}/assets", () => {
    const path = "/projects/{projectId}/assets";
    const params = { params: Promise.resolve({ id: PROJECT_ID }) };

    it("refuses an oversized upload with the documented 413 (E-4)", async () => {
        withTables({ projects: row({ id: PROJECT_ID }) });
        const { MAX_ASSET_BYTES } = await import("@/lib/data/project-assets");
        const { POST } = await import("@/app/api/v1/projects/[id]/assets/route");

        const form = new FormData();
        form.set(
            "file",
            new File([new Uint8Array(MAX_ASSET_BYTES + 1)], "big.png", { type: "image/png" }),
        );

        const response = await POST(
            request(`/api/v1/projects/${PROJECT_ID}/assets`, { method: "POST", body: form }),
            params as never,
        );

        await expectApiError(response, path, "post", "payload_too_large");
    });

    it("refuses a JSON body that is not a documented asset source (422)", async () => {
        withTables({ projects: row({ id: PROJECT_ID }) });
        const { POST } = await import("@/app/api/v1/projects/[id]/assets/route");

        await expectApiError(
            await POST(
                request(`/api/v1/projects/${PROJECT_ID}/assets`, json({ source: "flickr" })),
                params as never,
            ),
            path,
            "post",
            "validation_failed",
        );
    });
});
