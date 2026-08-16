import { describe, expect, it } from "vitest";

import { GOODWILL_WINDOW_DAYS, assertCanEdit, checkEditPermission } from "@/lib/data/entitlements";
import { listDeployments } from "@/lib/data/deployments";
import { createFakeDb } from "../support/fake-db";

// R3 D13 — editing a site that is already live (Doc 22 P5).
//
// A draft is free to change. Once it has been published, changing it again needs an
// `edit_unlock` — except for the first seven days, which are a goodwill window. All of it is
// decided here rather than in the editor, because a gate the client evaluates is not a gate.

const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const LIVE_URL = "https://kettle.pagecraft.in";

function site() {
    const db = createFakeDb({ users: [{ id: "u1" }] });
    const project = db.insert("projects", { user_id: "u1", name: "Kettle & Co.", content_json: {} });
    return { db, id: project.id as string };
}

function published(db: ReturnType<typeof site>["db"], projectId: string, when: string) {
    db.insert("deployments", {
        project_id: projectId,
        status: "live",
        live_url: LIVE_URL,
        created_at: when,
        updated_at: when,
    });
}

describe("a site nobody has published", () => {
    it("is a draft, and drafts are free to change", async () => {
        const { db, id } = site();

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            allowed: true,
            reason: "never_published",
        });
    });

    it("is not unlocked by a publish that failed", async () => {
        // A failed attempt did not put anything in front of anybody, so nothing has changed
        // about what editing means.
        const { db, id } = site();
        db.insert("deployments", { project_id: id, status: "failed", created_at: ago(30 * DAY) });

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            reason: "never_published",
        });
    });
});

describe("the goodwill window", () => {
    it("lets the first days after publishing through without an unlock", async () => {
        const { db, id } = site();
        published(db, id, ago(2 * DAY));

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            allowed: true,
            reason: "goodwill_window",
        });
    });

    it("still applies on its last day", async () => {
        const { db, id } = site();
        published(db, id, ago(GOODWILL_WINDOW_DAYS * DAY - 60_000));

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            reason: "goodwill_window",
        });
    });

    it("has closed the day after", async () => {
        const { db, id } = site();
        published(db, id, ago(GOODWILL_WINDOW_DAYS * DAY + DAY));

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            allowed: false,
            reason: "locked",
        });
    });

    it("runs from the first publish, not the most recent", async () => {
        // Measuring from the latest publish would renew the window on every republish, so
        // anybody willing to press publish again would never pay. That is not a goodwill
        // window; it is a subscription nobody is charged for.
        const { db, id } = site();
        published(db, id, ago(60 * DAY)); // the original launch
        published(db, id, ago(1 * DAY)); //  a republish yesterday

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            allowed: false,
            reason: "locked",
        });
    });
});

describe("after the window", () => {
    it("an edit_unlock reopens editing", async () => {
        const { db, id } = site();
        published(db, id, ago(60 * DAY));
        db.insert("entitlements", {
            user_id: "u1",
            project_id: id,
            kind: "edit_unlock",
            source: "paid",
            status: "active",
        });

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            allowed: true,
            reason: "unlocked",
        });
    });

    it("pro covers it too", async () => {
        const { db, id } = site();
        published(db, id, ago(60 * DAY));
        db.insert("entitlements", { user_id: "u1", kind: "pro", source: "pro", status: "active" });

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            allowed: true,
            reason: "pro",
        });
    });

    it("an unlock bought for another site does not carry over", async () => {
        const { db, id } = site();
        const other = db.insert("projects", { user_id: "u1", name: "Other", content_json: {} });
        published(db, id, ago(60 * DAY));
        db.insert("entitlements", {
            user_id: "u1",
            project_id: other.id,
            kind: "edit_unlock",
            source: "paid",
            status: "active",
        });

        await expect(checkEditPermission(db.asUser("u1"), "u1", id)).resolves.toMatchObject({
            allowed: false,
        });
    });

    it("refuses the write, and says what would let it through", async () => {
        const { db, id } = site();
        published(db, id, ago(60 * DAY));

        await expect(assertCanEdit(db.asUser("u1"), "u1", id)).rejects.toMatchObject({
            code: "payment_required",
            message: expect.stringContaining(`${GOODWILL_WINDOW_DAYS} days`),
        });
    });
});

describe("the publish history behind screen 02", () => {
    it("lists attempts newest first", async () => {
        const { db, id } = site();
        db.insert("deployments", { project_id: id, status: "failed", created_at: ago(3 * DAY), error: "boom" });
        published(db, id, ago(1 * DAY));

        const history = await listDeployments(db.asUser("u1"), id);

        expect(history).toHaveLength(2);
        expect(history[0]!.state).toBe("live");
        expect(history[1]!.state).toBe("failed");
    });

    it("keeps the failures, and explains them in the owner's words", async () => {
        // A history that hid failures would be the dashboard that said "draft" forever —
        // pleasant and useless. Somebody debugging needs those rows most of all.
        //
        // What it shows changed at R3 D18. It used to be whatever sentence the failing
        // branch happened to write, and the provider's own strings went in beside it. Now
        // the row stores a reason and the words are derived, so the history says what
        // happened *and* what to do — and improving the wording improves rows already
        // written rather than only the next one.
        const { db, id } = site();
        db.insert("deployments", {
            project_id: id,
            status: "failed",
            created_at: ago(DAY),
            failure_reason: "hosting_failed",
            error: "hosting API 503",
        });

        const [attempt] = await listDeployments(db.asUser("u1"), id);
        expect(attempt.error).toBe(
            "Your files are uploaded, but we could not switch the site on. " +
                "Nothing needs redoing. Try publishing again — if it happens twice, tell us and we will finish it by hand.",
        );
        expect(attempt.error).not.toContain("503");
    });

    it("still explains a failure recorded before reasons were stored", async () => {
        // Rows written by the old code have prose and no reason. The migration backfills
        // them to `unknown`, whose words are true of any of them; a row that somehow has
        // neither must still not read as a blank.
        const { db, id } = site();
        db.insert("deployments", { project_id: id, status: "failed", created_at: ago(DAY), error: "boom" });

        const [attempt] = await listDeployments(db.asUser("u1"), id);
        expect(attempt.error).toMatch(/Publishing did not finish\./);
        expect(attempt.error).toMatch(/Nothing you have made is lost/);
    });

    it("surfaces a URL only for an attempt that reached live (C-05)", async () => {
        const { db, id } = site();
        db.insert("deployments", {
            project_id: id,
            status: "failed",
            live_url: LIVE_URL, // a stale value from an earlier attempt
            created_at: ago(DAY),
        });

        const [attempt] = await listDeployments(db.asUser("u1"), id);
        expect(attempt.liveUrl).toBeNull();
    });

    it("is empty for a project nobody has published", async () => {
        const { db, id } = site();
        await expect(listDeployments(db.asUser("u1"), id)).resolves.toEqual([]);
    });

    it("shows somebody else nothing", async () => {
        const { db, id } = site();
        published(db, id, ago(DAY));
        db.insert("users", { id: "u2" });

        await expect(listDeployments(db.asUser("u2"), id)).resolves.toEqual([]);
    });
});
