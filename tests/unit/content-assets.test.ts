import { describe, expect, it } from "vitest";

import { patchProjectContent } from "@/lib/data/project-content";
import type { ContentSchema } from "@/lib/contracts";
import { createFakeDb } from "../support/fake-db";

// R3 D7 (S-1) — content_json may not name an image the project does not have.
//
// applyContentOps checks an image value is "a string or null" and cannot do better: it is
// pure, and whether an id exists is a question for the database. So `hero.image` used to
// accept any string at all. Every one of these saves cleanly and goes wrong later, at
// publish, as a broken image on a live site with nothing in the editor to explain it.

const SCHEMA: ContentSchema = {
    sections: [
        {
            key: "hero",
            label: "Hero",
            fields: [
                { key: "headline", label: "Headline", type: "text", maxLength: 60 },
                { key: "image", label: "Photo", type: "image" },
            ],
        },
        {
            key: "menu",
            label: "Menu",
            fields: [
                {
                    key: "items",
                    label: "Cards",
                    type: "list",
                    itemSchema: [
                        { key: "title", label: "Title", type: "text" },
                        { key: "photo", label: "Photo", type: "image" },
                    ],
                },
            ],
        },
    ],
};

const OTHER_UUID = "11111111-2222-4333-8444-555555555555";

function projectWithAnAsset() {
    const db = createFakeDb({ users: [{ id: "u1" }] });
    const project = db.insert("projects", {
        user_id: "u1",
        name: "Kettle & Co.",
        content_schema: SCHEMA,
        content_json: {},
    });
    const id = project.id as string;
    const asset = db.insert("assets", { project_id: id, storage_path: `u1/${id}/a.jpg` });
    return { db, id, assetId: asset.id as string };
}

describe("an image slot names an asset the project owns", () => {
    it("accepts one of the project's own assets", async () => {
        const { db, id, assetId } = projectWithAnAsset();

        await expect(
            patchProjectContent(db.asUser("u1"), id, [{ path: "hero.image", value: assetId }]),
        ).resolves.toMatchObject({ rendered: true });
    });

    it("still accepts null, which is how a slot is cleared", async () => {
        const { db, id } = projectWithAnAsset();

        await expect(
            patchProjectContent(db.asUser("u1"), id, [{ path: "hero.image", value: null }]),
        ).resolves.toMatchObject({ rendered: true });
    });

    it("refuses an asset id belonging to somebody else's project", async () => {
        const { db, id } = projectWithAnAsset();
        const theirs = db.insert("projects", { user_id: "u2", name: "Theirs", content_json: {} });
        const theirAsset = db.insert("assets", {
            project_id: theirs.id,
            storage_path: `u2/${theirs.id}/a.jpg`,
        });

        await expect(
            patchProjectContent(db.asUser("u1"), id, [
                { path: "hero.image", value: theirAsset.id as string },
            ]),
        ).rejects.toMatchObject({ code: "validation_failed" });
    });

    it("refuses an id that is not an asset at all", async () => {
        const { db, id } = projectWithAnAsset();

        await expect(
            patchProjectContent(db.asUser("u1"), id, [{ path: "hero.image", value: OTHER_UUID }]),
        ).rejects.toMatchObject({ code: "validation_failed" });
    });

    it("reports a malformed id as a bad request, not as our failure", async () => {
        // Postgres rejects a malformed uuid inside `in (...)` with 22P02. Left to reach the
        // database, a typo would come back as a 500 telling the caller to retry something
        // that can never work.
        const { db, id } = projectWithAnAsset();

        await expect(
            patchProjectContent(db.asUser("u1"), id, [{ path: "hero.image", value: "not-a-uuid" }]),
        ).rejects.toMatchObject({ code: "validation_failed" });
    });

    it("checks images inside list items too", async () => {
        // A hole here would be arbitrary: the same slot type, hidden one level down.
        const { db, id, assetId } = projectWithAnAsset();

        await expect(
            patchProjectContent(db.asUser("u1"), id, [
                { path: "menu.items", value: [{ title: "To start", photo: assetId }] },
            ]),
        ).resolves.toMatchObject({ rendered: true });

        await expect(
            patchProjectContent(db.asUser("u1"), id, [
                { path: "menu.items", value: [{ title: "Mains", photo: OTHER_UUID }] },
            ]),
        ).rejects.toMatchObject({ code: "validation_failed" });
    });

    it("does not go to the database when no image is being set", async () => {
        // Text edits are the common case by a wide margin; they should not pay for a check
        // that has nothing to look at.
        const { db, id } = projectWithAnAsset();
        let assetReads = 0;
        const client = db.asUser("u1");
        const proxy = new Proxy(client as unknown as Record<string, unknown>, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                if (prop === "from" && typeof value === "function") {
                    return (table: string, ...rest: unknown[]) => {
                        if (table === "assets") assetReads += 1;
                        return (value as (...a: unknown[]) => unknown).apply(target, [table, ...rest]);
                    };
                }
                return value;
            },
        }) as unknown as typeof client;

        await patchProjectContent(proxy, id, [{ path: "hero.headline", value: "Hello" }]);

        expect(assetReads).toBe(0);
    });
});
