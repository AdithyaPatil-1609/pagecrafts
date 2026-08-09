import type { ContentOp } from "@/lib/contracts";
import {
    statusOf,
    stubDeleteFile,
    stubGetFile,
    stubGetProject,
    stubListCommits,
    stubListFiles,
    stubPatchContent,
    stubPutFile,
} from "./persistence";

// A stand-in for `fetch`, covering the persistence endpoints (R3 D4).
//
// The reason this exists rather than just the functions next door: code written against
// stub *functions* has to be rewritten when the real API lands, and the rewrite is where
// integration bugs come from. Code written against these URLs does not — swapping
// `stubFetch` for `fetch` is the whole change, which is exactly what D6 asks Preethi to do.
//
//   const api = process.env.NEXT_PUBLIC_USE_STUBS === "1" ? stubFetch : fetch;
//   const res = await api(`/api/v1/projects/${id}/files/index.html`);
//
// Responses are real Response objects carrying the contract's envelope and the status code
// the live route would return, so loading, empty and error states can all be built now.

let latencyMs = 0;

/**
 * Delay every stub response, to exercise loading states. Zero by default, because a test
 * asserting on a stub should not have to wait for it.
 */
export function setStubLatency(ms: number): void {
    latencyMs = Math.max(0, ms);
}

function respond(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

function notFound(): Response {
    return respond(
        { ok: false, error: { code: "not_found", message: "There is nothing at that address." } },
        404,
    );
}

async function readJson(init: RequestInit | undefined): Promise<unknown> {
    if (typeof init?.body !== "string") return null;
    try {
        return JSON.parse(init.body);
    } catch {
        return null;
    }
}

// /api/v1/projects/{id}(/rest...)
const ROUTE = /^\/api\/v1\/projects\/([^/]+)(?:\/(.*))?$/;

export async function stubFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
        "http://stub.local",
    );
    const method = (init?.method ?? "GET").toUpperCase();

    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));

    const match = ROUTE.exec(url.pathname);
    if (!match) return notFound();

    const rest = match[2] ?? "";

    if (rest === "" && method === "GET") {
        const result = stubGetProject();
        return respond(result, statusOf(result));
    }

    if (rest === "files" && method === "GET") {
        const result = stubListFiles();
        return respond(result, statusOf(result));
    }

    if (rest === "commits" && method === "GET") {
        const result = stubListCommits();
        return respond(result, statusOf(result));
    }

    if (rest === "content" && method === "PATCH") {
        const body = (await readJson(init)) as { ops?: ContentOp[] } | null;
        const result = stubPatchContent(body?.ops ?? []);
        return respond(result, statusOf(result));
    }

    if (rest.startsWith("files/")) {
        // Nested paths arrive as path segments and are rebuilt exactly as the real
        // catch-all route rebuilds them.
        const path = rest
            .slice("files/".length)
            .split("/")
            .map(decodeURIComponent)
            .join("/");

        if (method === "GET") {
            const result = stubGetFile(path);
            return respond(result, statusOf(result));
        }
        if (method === "PUT") {
            const body = (await readJson(init)) as { content?: unknown } | null;
            const result = stubPutFile(path, body?.content as string);
            return respond(result, statusOf(result));
        }
        if (method === "DELETE") {
            const result = stubDeleteFile(path);
            return respond(result, statusOf(result));
        }
    }

    return notFound();
}
