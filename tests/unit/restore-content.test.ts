import { describe, expect, it } from "vitest";

import { restoreProject } from "@/lib/data/restore";
import { treeSha } from "@/lib/data/tree-hash";
import type { ContentSchema } from "@/lib/contracts";
import { createFakeDb } from "../support/fake-db";

// R3 D7 (S-1) — going back in time takes the content with it.
//
// Restore wrote the old files over the working tree and left content_json alone. The page
// then said one thing and the content panel said another, and because the panel is what the
// next save writes back, the first edit after a restore would push the *newer* words back
// over the older page. The two have to move together or neither can be trusted.

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
    ],
};

const page = (headline: string) => ({
    "index.html": `<h1 data-slot="hero.headline">${headline}</h1>`,
});

const MONDAY = page("Monday's words");
const ASSET_ID = "11111111-2222-4333-8444-555555555555";

function projectWithHistory() {
    const db = createFakeDb({ users: [{ id: "u1" }] });
    const project = db.insert("projects", {
        user_id: "u1",
        name: "Kettle & Co.",
        content_schema: SCHEMA,
        // Where the project stands today: newer words, and a photo the owner picked.
        content_json: { hero: { headline: "Friday's words", image: ASSET_ID } },
    });
    const id = project.id as string;

    db.insert("project_files", { project_id: id, path: "index.html", content: page("Friday's words")["index.html"] });

    const sha = treeSha(MONDAY);
    db.insert("commits", { project_id: id, sha, message: "Monday", author: "system", snapshot: MONDAY });

    return { db, id, sha };
}

describe("restoring a version", () => {
    it("brings content_json back to what the restored files say", async () => {
        const { db, id, sha } = projectWithHistory();

        await restoreProject(db.asUser("u1"), id, sha);

        const content = db.rows("projects").find((p) => p.id === id)!.content_json as Record<
            string,
            Record<string, unknown>
        >;
        expect(content.hero.headline).toBe("Monday's words");
    });

    it("keeps the photograph the owner chose", async () => {
        // The markup only carries a URL; the asset id lives in content_json and nowhere
        // else. Rebuilding content from files without carrying images across would quietly
        // unpick the picture as a side effect of restoring some words.
        const { db, id, sha } = projectWithHistory();

        await restoreProject(db.asUser("u1"), id, sha);

        const content = db.rows("projects").find((p) => p.id === id)!.content_json as Record<
            string,
            Record<string, unknown>
        >;
        expect(content.hero.image).toBe(ASSET_ID);
    });

    it("leaves the files and the content saying the same thing", async () => {
        // The invariant, stated directly: whatever else changes, these two agree afterwards.
        const { db, id, sha } = projectWithHistory();

        await restoreProject(db.asUser("u1"), id, sha);

        const html = db.rows("project_files").find((f) => f.project_id === id)!.content as string;
        const content = db.rows("projects").find((p) => p.id === id)!.content_json as Record<
            string,
            Record<string, unknown>
        >;

        expect(html).toContain(content.hero.headline as string);
    });
});
