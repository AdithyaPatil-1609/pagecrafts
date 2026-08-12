import { describe, expect, it } from "vitest";

import { advanceDeployment, recordDeployment, startDeployment } from "@/lib/data/deployments";
import { listProjects } from "@/lib/data/projects";
import { createFakeDb } from "../support/fake-db";

// R3 D12 — the dashboard tells the truth about publishing (V-7, N-4).
//
// Nothing wrote a deployment row before this. The dashboard has read them since D2, so every
// project reported "draft" however many times it had been published, and a failed publish
// was invisible until somebody opened the project and tried again.

const LIVE_URL = "https://kettle.pagecraft.in";

function aProject() {
    const db = createFakeDb({ users: [{ id: "u1" }] });
    const project = db.insert("projects", { user_id: "u1", name: "Kettle & Co.", content_json: {} });
    return { db, id: project.id as string };
}

describe("an attempt is recorded before it can succeed", () => {
    it("writes a pending row as soon as publishing starts", async () => {
        // So the dashboard says "publishing" while it happens, rather than staying blank
        // until it is over.
        const { db, id } = aProject();

        const started = await startDeployment(db.asUser("u1"), id);

        expect(started.state).toBe("pending");
        expect(db.rows("deployments")).toHaveLength(1);
        expect(db.rows("deployments")[0]!.project_id).toBe(id);
    });

    it("leaves a pending row behind if the publish never reports back", async () => {
        // Honest: something was started and nobody knows how it ended. A missing row would
        // claim nothing was ever tried.
        const { db, id } = aProject();
        await startDeployment(db.asUser("u1"), id);

        expect(db.rows("deployments")[0]!.status).toBe("pending");
    });
});

describe("the row follows the publish", () => {
    it("carries the intermediate states the flow reports", async () => {
        const { db, id } = aProject();
        const { id: deploymentId } = await startDeployment(db.asUser("u1"), id);

        for (const state of ["provisioning", "pushing", "enabling_hosting", "verifying"] as const) {
            await advanceDeployment(db.asUser("u1"), deploymentId, state);
            expect(db.rows("deployments")[0]!.status).toBe(state);
        }
    });

    it("records a success with its URL", async () => {
        const { db, id } = aProject();
        const { id: deploymentId } = await startDeployment(db.asUser("u1"), id);

        await advanceDeployment(db.asUser("u1"), deploymentId, "live", { liveUrl: LIVE_URL });

        expect(db.rows("deployments")[0]!.status).toBe("live");
        expect(db.rows("deployments")[0]!.live_url).toBe(LIVE_URL);
    });

    it("records a failure with the reason", async () => {
        const { db, id } = aProject();
        const { id: deploymentId } = await startDeployment(db.asUser("u1"), id);

        await advanceDeployment(db.asUser("u1"), deploymentId, "failed", {
            error: "hosting refused the subdomain",
        });

        expect(db.rows("deployments")[0]!.status).toBe("failed");
        expect(db.rows("deployments")[0]!.error).toBe("hosting refused the subdomain");
    });

    it("refuses to call a deployment live with no URL", async () => {
        // The database has the same CHECK. Saying it here means the caller is told which
        // rule was broken, at the point the mistake was made, instead of reading a Postgres
        // constraint name out of a 500.
        const { db, id } = aProject();
        const { id: deploymentId } = await startDeployment(db.asUser("u1"), id);

        await expect(
            advanceDeployment(db.asUser("u1"), deploymentId, "live"),
        ).rejects.toMatchObject({ message: expect.stringContaining("verified URL") });
    });

    it("moves the timestamp when it moves the state", async () => {
        const { db, id } = aProject();
        const { id: deploymentId } = await startDeployment(db.asUser("u1"), id);
        db.rows("deployments")[0]!.updated_at = "2026-08-01T00:00:00.000Z";

        await advanceDeployment(db.asUser("u1"), deploymentId, "pushing");

        expect(db.rows("deployments")[0]!.updated_at).not.toBe("2026-08-01T00:00:00.000Z");
    });
});

describe("what the dashboard then shows", () => {
    it("reports the real state, not 'draft'", async () => {
        const { db, id } = aProject();
        const { id: deploymentId } = await startDeployment(db.asUser("u1"), id);
        await advanceDeployment(db.asUser("u1"), deploymentId, "live", { liveUrl: LIVE_URL });

        const [summary] = await listProjects(db.asUser("u1"), "u1");

        expect(summary.status).toBe("live");
        expect(summary.liveUrl).toBe(LIVE_URL);
    });

    it("shows a failed publish without anybody opening the project (V-7)", async () => {
        const { db, id } = aProject();
        const { id: deploymentId } = await startDeployment(db.asUser("u1"), id);
        await advanceDeployment(db.asUser("u1"), deploymentId, "failed", { error: "boom" });

        const [summary] = await listProjects(db.asUser("u1"), "u1");

        expect(summary.status).toBe("failed");
        // C-05: never surface a URL that has not been confirmed to respond.
        expect(summary.liveUrl).toBeNull();
    });

    it("shows the newest attempt when a site is republished", async () => {
        const { db, id } = aProject();

        const first = await startDeployment(db.asUser("u1"), id);
        await advanceDeployment(db.asUser("u1"), first.id, "failed", { error: "boom" });
        db.rows("deployments")[0]!.created_at = "2026-08-01T00:00:00.000Z";

        const second = await startDeployment(db.asUser("u1"), id);
        await advanceDeployment(db.asUser("u1"), second.id, "live", { liveUrl: LIVE_URL });

        const [summary] = await listProjects(db.asUser("u1"), "u1");
        expect(summary.status).toBe("live");
    });
});

describe("wiring a whole attempt", () => {
    it("turns the publish flow's own callback into rows", async () => {
        const { db, id } = aProject();
        const recorder = await recordDeployment(db.asUser("u1"), id);

        recorder.onState("provisioning");
        recorder.onState("pushing");
        await recorder.finish({ state: "live", liveUrl: LIVE_URL, commitSha: "abc1234" });

        const row = db.rows("deployments")[0]!;
        expect(row.status).toBe("live");
        expect(row.live_url).toBe(LIVE_URL);
        expect(row.commit_sha).toBe("abc1234");
        expect(db.rows("deployments")).toHaveLength(1);
    });

    it("never lets a status write break a publish that is otherwise fine", () => {
        // Losing the progress line is cosmetic. A site half-deployed because its status row
        // could not be written is not.
        const { db, id } = aProject();

        return recordDeployment(db.asUser("u1"), id).then((recorder) => {
            db.rows("deployments").length = 0;
            expect(() => recorder.onState("verifying")).not.toThrow();
        });
    });
});
