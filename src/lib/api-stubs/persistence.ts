import type {
    ApiResult,
    Commit,
    ContentOp,
    ContentSchema,
    ErrorCode,
    FileMap,
    GetProjectFilesResponse,
    ListCommitsResponse,
    PatchContentResponse,
    ProjectDetail,
} from "@/lib/contracts";
import { ERROR_STATUS } from "@/lib/errors/codes";
import { isValidFilePath } from "@/lib/data/validate-file-map";
import { SEED_PROJECT } from "@/lib/seed";

// Deterministic in-memory stubs for the persistence API.
// Answers in contract-shaped ApiResult envelopes. Call resetStubs() between tests.

export const STUB_PROJECT_ID = "00000000-0000-4000-8000-000000000001";
export const STUB_TEMPLATE_ID = "00000000-0000-4000-8000-000000000002";

// Frozen clock. Every timestamp the stubs return is derived from this, so nothing a
// caller renders shifts between runs.
const STUB_TIME = "2026-08-08T09:00:00.000Z";

// Shas look like shas — Preethi's history UI truncates them, Hanish's auto-commit
// references them — but they are fixed strings, not hashes of anything.
const STUB_COMMITS: Commit[] = [
    {
        sha: "9f1c2ab3d4e5f60718293a4b5c6d7e8f90a1b2c3",
        message: "Add the opening hours section",
        author: "user",
        createdAt: "2026-08-08T08:45:00.000Z",
    },
    {
        sha: "5e4d3c2b1a0918273645546372819a0b1c2d3e4f",
        message: "Rewrite the hero copy",
        author: "ai_edit",
        createdAt: "2026-08-08T08:30:00.000Z",
    },
    {
        sha: "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d",
        message: "Start from the Cafe design",
        author: "system",
        createdAt: "2026-08-08T08:00:00.000Z",
    },
];

// The shape the content panel would be drawn from. It travels with the project row, so the
// stub carries one too — a panel rendered against the stubs is the same panel.
const STUB_SCHEMA: ContentSchema = {
    sections: [
        {
            key: "hero",
            label: "Hero",
            fields: [
                { key: "headline", label: "Headline", type: "text", maxLength: 60 },
                { key: "subhead", label: "Subheading", type: "text", maxLength: 140 },
            ],
        },
        {
            key: "site",
            label: "Site",
            fields: [
                { key: "name", label: "Site name", type: "text", maxLength: 40 },
                { key: "footer", label: "Footer note", type: "text", maxLength: 120 },
            ],
        },
    ],
};

const STUB_CONTENT: Record<string, unknown> = {
    hero: { headline: "Coffee worth walking for.", subhead: "Slow-roasted beans, bread baked at dawn." },
    site: { name: "Kettle & Co.", footer: "Built with PageCraft." },
};

// The schema the content panel is generated from (R2 D8). It describes exactly the content
// above, because a stub that disagrees with itself teaches the panel to tolerate a state the
// real API never produces. Every FieldType the panel renders appears at least once, so the
// stubbed editor exercises each control rather than only the text ones.
const STUB_SCHEMA: ContentSchema = {
    sections: [
        {
            key: "hero",
            label: "Hero",
            fields: [
                { key: "headline", label: "Headline", type: "text", maxLength: 60 },
                { key: "subhead", label: "Subheading", type: "richtext", maxLength: 140 },
                { key: "image", label: "Photo", type: "image" },
            ],
        },
        {
            key: "site",
            label: "Site",
            fields: [
                { key: "name", label: "Site name", type: "text", maxLength: 40 },
                { key: "footer", label: "Footer", type: "text", maxLength: 120 },
                { key: "accent", label: "Accent colour", type: "color" },
                { key: "layout", label: "Layout", type: "select", options: ["split", "full-bleed", "centered"] },
            ],
        },
    ],
};

interface StubState {
    files: FileMap;
    content: Record<string, unknown>;
    commits: Commit[];
}

function initialState(): StubState {
    return {
        files: { ...SEED_PROJECT },
        content: structuredClone(STUB_CONTENT),
        commits: [...STUB_COMMITS],
    };
}

let state = initialState();

/** Put the stubs back to their opening position. Call between tests. */
export function resetStubs(): void {
    state = initialState();
}

function ok<T>(data: T): ApiResult<T> {
    return { ok: true, data };
}

function fail(code: ErrorCode, message: string, detail?: string): ApiResult<never> {
    return { ok: false, error: { code, message, ...(detail ? { detail } : {}) } };
}

/** The status the real route would answer with — stubs mirror it so error UIs are real. */
export function statusOf(result: ApiResult<unknown>, okStatus = 200): number {
    return result.ok ? okStatus : ERROR_STATUS[result.error.code];
}

export function stubGetProject(): ApiResult<ProjectDetail> {
    return ok({
        id: STUB_PROJECT_ID,
        name: "Kettle & Co.",
        status: "draft",
        liveUrl: null,
        thumbnailUrl: null,
        updatedAt: STUB_TIME,
        sourceTemplateId: STUB_TEMPLATE_ID,
        contentJson: state.content,
        contentSchema: STUB_SCHEMA,
        siteMeta: {},
        formEndpoint: null,
        contentSchema: STUB_SCHEMA,
    });
}

export function stubListFiles(): ApiResult<GetProjectFilesResponse> {
    return ok({ projectId: STUB_PROJECT_ID, files: { ...state.files }, updatedAt: STUB_TIME });
}

export function stubGetFile(path: string) {
    if (!isValidFilePath(path)) {
        return fail("validation_failed", "That file path is not valid.", path);
    }
    const content = state.files[path];
    if (content === undefined) {
        return fail("not_found", "That file does not exist in this project.");
    }

    return ok({ projectId: STUB_PROJECT_ID, path, content, updatedAt: STUB_TIME });
}

// Mirrors the real route's promise: a write marks the tree dirty and never commits (V-4),
// so the stub's history does not grow when a file is saved.
export function stubPutFile(path: string, content: string) {
    if (!isValidFilePath(path)) {
        return fail("validation_failed", "That file path is not valid.", path);
    }
    if (typeof content !== "string") {
        return fail("validation_failed", "Some fields were invalid.", "content must be a string");
    }

    state.files[path] = content;
    return ok({ projectId: STUB_PROJECT_ID, path, dirty: true, updatedAt: STUB_TIME });
}

export function stubDeleteFile(path: string) {
    if (!isValidFilePath(path)) {
        return fail("validation_failed", "That file path is not valid.", path);
    }
    if (!(path in state.files)) {
        return fail("not_found", "That file does not exist in this project.");
    }

    delete state.files[path];
    return ok({ projectId: STUB_PROJECT_ID, path, dirty: true, updatedAt: STUB_TIME });
}

export function stubListCommits(): ApiResult<ListCommitsResponse> {
    return ok({ items: [...state.commits] });
}

// Ops are applied to a plain object here rather than validated against a content_schema:
// the stub's job is a predictable answer, and schema validation is the real route's (and
// is covered by its own tests). Shape errors that an integrator's UI must handle — an
// empty op list, a path that is not a dotted string — are still refused.
export function stubPatchContent(ops: ContentOp[]): ApiResult<PatchContentResponse> {
    if (!Array.isArray(ops) || ops.length === 0) {
        return fail("validation_failed", "Some edits were invalid.", "ops must not be empty");
    }

    for (const op of ops) {
        if (typeof op?.path !== "string" || op.path.trim() === "") {
            return fail("validation_failed", "Some edits were invalid.", "every op needs a path");
        }

        const segments = op.path.split(".");
        const leaf = segments.pop()!;
        let cursor = state.content;

        for (const segment of segments) {
            const next = cursor[segment];
            if (typeof next !== "object" || next === null) cursor[segment] = {};
            cursor = cursor[segment] as Record<string, unknown>;
        }
        cursor[leaf] = op.value;
    }

    return ok({ rendered: true, dirty: true });
}

/** The content the stub is holding — for asserting an edit landed. */
export function stubContent(): Record<string, unknown> {
    return structuredClone(state.content);
}
