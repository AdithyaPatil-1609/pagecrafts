import { test, expect, type APIRequestContext } from '@playwright/test';
import { STATE } from './support/users';

// D16 security review, and the D20 milestone: a deliberate cross-user read must fail at
// the database, not at a check someone remembered to write in a route handler.
//
// The seed gives Meera and Arjun one project each. Signed in as Meera, every route below
// is asked for Arjun's. RLS is owner-scoped, so his row is invisible rather than
// forbidden -- which is why the answer must be not_found and never forbidden (SEC-14).
// A 403 would confirm the id exists and belongs to somebody, which is itself a leak.
const MEERA_PROJECT = 'bbbbbbbb-0000-4000-8000-000000000001';
const ARJUN_PROJECT = 'bbbbbbbb-0000-4000-8000-000000000002';

const withAuth = process.env.E2E_WITH_AUTH === '1';

// Only paths that actually have a GET. /content is PATCH-only and /assets is POST-only;
// asking them for a GET hits Next's own 405 with an empty body, which proves nothing
// about ownership. Both are covered under WRITES.
const READS = [
    '',
    '/files',
    '/commits',
    '/composition',
];

const WRITES: Array<{ path: string; method: 'post' | 'put' | 'patch'; body: unknown }> = [
    { path: '', method: 'patch', body: { name: 'taken over' } },
    { path: '/files', method: 'put', body: { files: { 'index.html': '<h1>mine now</h1>' } } },
    { path: '/content', method: 'patch', body: { ops: [] } },
    { path: '/commits', method: 'post', body: { message: 'not my project' } },
    { path: '/restore', method: 'post', body: { sha: 'deadbeef' } },
    { path: '/generate', method: 'post', body: { prompt: 'a site that is not mine' } },
    { path: '/edits', method: 'post', body: { instruction: 'change the hero' } },
];

async function bodyOf(response: { json: () => Promise<unknown> }) {
    return (await response.json()) as { ok: boolean; error?: { code: string; message: string } };
}

function assertHidden(status: number, body: { ok: boolean; error?: { code: string } }, where: string) {
    expect(status, `${where} answered ${status}`).toBe(404);
    expect(body.ok, `${where} returned ok:true`).toBe(false);
    expect(body.error?.code, `${where} used the wrong code`).toBe('not_found');
}

test.describe("another person's project", () => {
    test.skip(!withAuth, 'needs Upstash: set E2E_WITH_AUTH=1');

    test.use({ storageState: STATE.first });

    let asMeera: APIRequestContext;

    test.beforeEach(async ({ page }) => {
        asMeera = page.request;
    });

    test('her own project is readable, so the test is proving something', async () => {
        const response = await asMeera.get(`/api/v1/projects/${MEERA_PROJECT}`);

        expect(response.status()).toBe(200);
    });

    test('and it is the only one the list returns', async () => {
        const response = await asMeera.get('/api/v1/projects');
        const body = (await response.json()) as { data: { items: Array<{ id: string }> } };
        const ids = body.data.items.map((p) => p.id);

        expect(ids).toContain(MEERA_PROJECT);
        expect(ids).not.toContain(ARJUN_PROJECT);
    });

    for (const suffix of READS) {
        test(`cannot be read at GET ${suffix || '/'}`, async () => {
            const response = await asMeera.get(
                `/api/v1/projects/${ARJUN_PROJECT}${suffix}`,
                { failOnStatusCode: false },
            );

            assertHidden(response.status(), await bodyOf(response), `GET ${suffix}`);
        });
    }

    test('cannot be read one file at a time', async () => {
        const response = await asMeera.get(
            `/api/v1/projects/${ARJUN_PROJECT}/files/index.html`,
            { failOnStatusCode: false },
        );

        assertHidden(response.status(), await bodyOf(response), 'GET /files/index.html');
    });

    for (const { path, method, body } of WRITES) {
        test(`cannot be changed by ${method.toUpperCase()} ${path || '/'}`, async () => {
            const response = await asMeera[method](
                `/api/v1/projects/${ARJUN_PROJECT}${path}`,
                { data: body, failOnStatusCode: false },
            );

            // A write may be refused before ownership is even considered -- a bad body, or
            // the AI guard. What must never happen is 2xx, and what must never come back
            // is 403, which would confirm the project exists.
            expect(response.status(), `${method} ${path} succeeded`).toBeGreaterThanOrEqual(400);
            expect(response.status(), `${method} ${path} leaked existence`).not.toBe(403);

            const answer = await bodyOf(response);
            expect(answer.ok).toBe(false);
        });
    }

    test('cannot be published, which is the one that costs money', async () => {
        const response = await asMeera.post(
            `/api/v1/projects/${ARJUN_PROJECT}/publish`,
            {
                headers: { 'idempotency-key': 'cross-user-attempt' },
                failOnStatusCode: false,
            },
        );

        expect(response.status()).toBeGreaterThanOrEqual(400);
        expect(response.status()).not.toBe(403);
        expect((await bodyOf(response)).ok).toBe(false);
    });

    test('an id that belongs to nobody looks exactly the same', async () => {
        const response = await asMeera.get(
            '/api/v1/projects/00000000-0000-0000-0000-0000000000ff',
            { failOnStatusCode: false },
        );

        assertHidden(response.status(), await bodyOf(response), 'GET a nonexistent id');
    });
});

test.describe('the other direction', () => {
    test.skip(!withAuth, 'needs Upstash: set E2E_WITH_AUTH=1');

    test.use({ storageState: STATE.second });

    test('Arjun cannot read Meera either, so this is not a one-way policy', async ({ page }) => {
        const mine = await page.request.get(`/api/v1/projects/${ARJUN_PROJECT}`);
        expect(mine.status()).toBe(200);

        const hers = await page.request.get(
            `/api/v1/projects/${MEERA_PROJECT}`,
            { failOnStatusCode: false },
        );

        assertHidden(hers.status(), await bodyOf(hers), 'Arjun reading Meera');
    });
});
