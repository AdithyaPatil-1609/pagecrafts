import { describe, expect, it } from "vitest";

import { createProject } from "@/lib/data/projects";
import { templateRow } from "../../scripts/seed-templates";
import { templateUuid } from "@/lib/templates/template-id";
import { TEMPLATES } from "@/lib/templates";
import { treeSha } from "@/lib/data/tree-hash";
import type { ContentSchema } from "@/lib/contracts";
import { PROJECTS_PER_USER } from "@/lib/limits/config";
import { createFakeDb } from "../support/fake-db";

// R3 D8 — a forked project holds together.
//
// The plan asks for an integrity check: "files, content_json, assets and the initial commit
// all referencing each other correctly". Written against a design taken straight out of the
// library rather than a hand-made fixture, because a fixture can be built to pass and the
// library is what people will actually fork.

// A free design, so these tests are about integrity rather than about the paywall. The
// paid path has its own tests below — picking a premium design here would have made every
// one of them fail for a reason that has nothing to do with what it is checking.
const DESIGN = TEMPLATES.find((t) => t.id === "portfolio")!;
const PAID_DESIGN = TEMPLATES.find((t) => t.id === "gym")!;

function libraryInTheTable() {
    const db = createFakeDb({ users: [{ id: "u1" }] });
    db.insert("templates", templateRow(DESIGN));
    return db;
}

describe("the id a design occupies", () => {
    it("is derived from the slug, so it is the same row everywhere", () => {
        expect(templateUuid("gym")).toBe(templateUuid("gym"));
        expect(templateUuid("gym")).not.toBe(templateUuid("portfolio"));
    });

    it("is a v5 uuid, which is what the column and the schema require", () => {
        expect(templateUuid("gym")).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
    });

    it("gives every design in the library its own", () => {
        // A collision would silently merge two designs into one row at seed time.
        const ids = new Set(TEMPLATES.map((t) => templateUuid(t.id)));
        expect(ids.size).toBe(TEMPLATES.length);
    });

    it("seeds a thumbnail the database will accept", () => {
        const url = templateRow(DESIGN).thumbnail_url;
        expect(url === null || String(url).startsWith("https://")).toBe(true);
    });
});

describe("a forked project", () => {
    it("answers with the id and the first commit", async () => {
        const db = libraryInTheTable();

        const result = await createProject(db.asUser("u1"), "u1", {
            name: DESIGN.name,
            sourceTemplateId: templateUuid(DESIGN.id),
        });

        expect(result.id).toBeTruthy();
        expect(result.firstCommit).toMatch(/^[0-9a-f]{7,40}$/);
    });

    it("holds the design's files, not a reference to them", async () => {
        const db = libraryInTheTable();
        const { id } = await createProject(db.asUser("u1"), "u1", {
            name: DESIGN.name,
            sourceTemplateId: templateUuid(DESIGN.id),
        });

        const files = db.rows("project_files").filter((f) => f.project_id === id);
        expect(files.map((f) => f.path).sort()).toEqual(Object.keys(DESIGN.files).sort());
    });

    it("carries its own schema and content, and they describe each other", async () => {
        const db = libraryInTheTable();
        const { id } = await createProject(db.asUser("u1"), "u1", {
            name: DESIGN.name,
            sourceTemplateId: templateUuid(DESIGN.id),
        });

        const project = db.rows("projects").find((p) => p.id === id)!;
        const schema = project.content_schema as ContentSchema;
        const content = project.content_json as Record<string, Record<string, unknown>>;

        expect(schema.sections.length).toBeGreaterThan(0);

        // Every section the content mentions is a section the schema knows about. The other
        // direction is deliberately not asserted: a section whose slots are all images has
        // nothing to seed, and that is correct rather than missing.
        for (const sectionKey of Object.keys(content)) {
            expect(schema.sections.map((s) => s.key)).toContain(sectionKey);
        }
    });

    it("has a first commit whose snapshot is the tree it was made from", async () => {
        // The reference that matters most: history starts at the state the person actually
        // landed on, so restoring to version one puts the site back as the design shipped.
        const db = libraryInTheTable();
        const { id, firstCommit } = await createProject(db.asUser("u1"), "u1", {
            name: DESIGN.name,
            sourceTemplateId: templateUuid(DESIGN.id),
        });

        const commit = db.rows("commits").find((c) => c.project_id === id)!;
        expect(commit.sha).toBe(firstCommit);
        expect(treeSha(commit.snapshot as Record<string, string>)).toBe(firstCommit);
    });

    it("starts with no assets, so nothing can be an orphaned reference yet", async () => {
        const db = libraryInTheTable();
        const { id } = await createProject(db.asUser("u1"), "u1", {
            name: DESIGN.name,
            sourceTemplateId: templateUuid(DESIGN.id),
        });

        expect(db.rows("assets").filter((a) => a.project_id === id)).toHaveLength(0);
    });

    it("leaves nothing behind when the design does not exist", async () => {
        // A project with no files is wreckage, not a draft: it renders as nothing and the
        // person cannot tell why.
        const db = createFakeDb({ users: [{ id: "u1" }] });

        await expect(
            createProject(db.asUser("u1"), "u1", {
                name: "Nowhere",
                sourceTemplateId: templateUuid("does-not-exist"),
            }),
        ).rejects.toMatchObject({ code: "not_found" });

        expect(db.rows("projects")).toHaveLength(0);
    });
});

// Doc 22 P2/P3 — a premium or signature design is paid for once, before the fork runs.
describe("a design that costs money", () => {
    function libraryWithPaidDesign() {
        const db = createFakeDb({ users: [{ id: "u1" }] });
        db.insert("templates", templateRow(PAID_DESIGN));
        return db;
    }

    it("is refused, and leaves nothing behind, when nothing has been paid", async () => {
        const db = libraryWithPaidDesign();

        await expect(
            createProject(db.asUser("u1"), "u1", {
                name: PAID_DESIGN.name,
                sourceTemplateId: templateUuid(PAID_DESIGN.id),
            }),
        ).rejects.toMatchObject({ code: "payment_required" });

        expect(db.rows("projects")).toHaveLength(0);
    });

    it("reads the price from the row, never from the caller", async () => {
        // The check that makes this a paywall rather than a suggestion. If tier came from
        // the request, anyone could ask for a signature design and call it free.
        const db = libraryWithPaidDesign();
        db.rows("templates")[0]!.tier = "free";

        await expect(
            createProject(db.asUser("u1"), "u1", {
                name: PAID_DESIGN.name,
                sourceTemplateId: templateUuid(PAID_DESIGN.id),
            }),
        ).resolves.toMatchObject({ id: expect.any(String) });
    });

    it("goes through for an account holding pro", async () => {
        const db = libraryWithPaidDesign();
        db.insert("entitlements", { user_id: "u1", kind: "pro", source: "pro", status: "active" });

        await expect(
            createProject(db.asUser("u1"), "u1", {
                name: PAID_DESIGN.name,
                sourceTemplateId: templateUuid(PAID_DESIGN.id),
            }),
        ).resolves.toMatchObject({ firstCommit: expect.any(String) });
    });

    it("does not accept an entitlement that has been revoked", async () => {
        // An expired or revoked row is not an entitlement. Filtering on status in the query
        // rather than afterwards is what keeps that true.
        const db = libraryWithPaidDesign();
        db.insert("entitlements", { user_id: "u1", kind: "pro", source: "paid", status: "revoked" });

        await expect(
            createProject(db.asUser("u1"), "u1", {
                name: PAID_DESIGN.name,
                sourceTemplateId: templateUuid(PAID_DESIGN.id),
            }),
        ).rejects.toMatchObject({ code: "payment_required" });
    });
});

describe("how many sites one account may hold", () => {
    function accountWith(count: number) {
        const db = createFakeDb({ users: [{ id: "u1" }] });
        db.insert("templates", templateRow(DESIGN));
        for (let i = 0; i < count; i++) {
            db.insert("projects", { user_id: "u1", name: `Site ${i}`, content_json: {} });
        }
        return db;
    }

    it("refuses the one past the cap, and says what can be done about it", async () => {
        const db = accountWith(PROJECTS_PER_USER);

        await expect(
            createProject(db.asUser("u1"), "u1", {
                name: "One too many",
                sourceTemplateId: templateUuid(DESIGN.id),
            }),
        ).rejects.toMatchObject({
            code: "payment_required",
            message: expect.stringContaining("Delete one, or upgrade"),
        });
    });

    it("allows the last one under the cap", async () => {
        const db = accountWith(PROJECTS_PER_USER - 1);

        await expect(
            createProject(db.asUser("u1"), "u1", {
                name: "Just in time",
                sourceTemplateId: templateUuid(DESIGN.id),
            }),
        ).resolves.toMatchObject({ id: expect.any(String) });
    });

    it("does not count somebody else's sites against you", async () => {
        const db = accountWith(PROJECTS_PER_USER);
        db.insert("users", { id: "u2" });

        await expect(
            createProject(db.asUser("u2"), "u2", {
                name: "Mine",
                sourceTemplateId: templateUuid(DESIGN.id),
            }),
        ).resolves.toMatchObject({ id: expect.any(String) });
    });

    it("does not cap an account holding pro", async () => {
        const db = accountWith(PROJECTS_PER_USER + 5);
        db.insert("entitlements", { user_id: "u1", kind: "pro", source: "pro", status: "active" });

        await expect(
            createProject(db.asUser("u1"), "u1", {
                name: "Another",
                sourceTemplateId: templateUuid(DESIGN.id),
            }),
        ).resolves.toMatchObject({ id: expect.any(String) });
    });
});
