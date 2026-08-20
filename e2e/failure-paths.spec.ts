import { test, expect, type APIResponse } from '@playwright/test';

// D14: "assert every failure path returns a real message, never a bare 500".
//
// Nothing here needs a credential, so unlike the sign-in walk this whole file runs on every
// machine and on every PR. That is the point: the guarantee it protects is one the app must
// keep even when Upstash, hosting and the AI provider are all absent.
//
// "A real message" is the strict half. A 500 with a polite sentence still fails these tests
// where the fault was in the request, because `internal` tells the user to wait for a fix
// that is never coming when the thing they need to do is correct their input.

interface Envelope {
    ok: boolean;
    error?: { code: string; message: string; detail?: string };
}

async function envelopeOf(response: APIResponse): Promise<Envelope> {
    const text = await response.text();

    try {
        return JSON.parse(text) as Envelope;
    } catch {
        throw new Error(
            `Expected a JSON envelope, got ${response.status()} ${response.headers()['content-type']}: ${text.slice(0, 200)}`,
        );
    }
}

// The one rule, written once.
async function expectRealFailure(response: APIResponse, what: string): Promise<Envelope> {
    expect(response.status(), `${what} answered ${response.status()}`).toBeLessThan(500);

    const body = await envelopeOf(response);

    expect(body.ok, `${what} did not use the failure envelope`).toBe(false);
    expect(body.error, `${what} carried no error object`).toBeTruthy();
    expect(typeof body.error!.code, `${what} has no code`).toBe('string');

    const message = body.error!.message;

    expect(typeof message, `${what} has no message`).toBe('string');
    expect(message.length, `${what} gave a message too terse to act on`).toBeGreaterThan(10);

    // The failure this catches is a message that is really the code in disguise —
    // "validation_failed" shown to somebody who has never heard the phrase.
    expect(message, `${what} showed the reader a machine code`).not.toMatch(/[a-z]+_[a-z]+/);

    return body;
}

test.describe('signed out, every door answers in words', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
    });

    const guarded: [string, string, Record<string, unknown> | undefined][] = [
        ['GET', '/api/v1/projects', undefined],
        ['POST', '/api/v1/projects', { name: 'nope' }],
        ['GET', '/api/v1/projects/00000000-0000-0000-0000-000000000000', undefined],
        ['GET', '/api/v1/auth/me', undefined],
        ['POST', '/api/v1/projects/00000000-0000-0000-0000-000000000000/publish', undefined],
        ['GET', '/api/v1/deployments/00000000-0000-0000-0000-000000000000', undefined],
    ];

    for (const [method, path, data] of guarded) {
        test(`${method} ${path} is refused, not crashed`, async ({ request }) => {
            const response = await request.fetch(path, {
                method,
                failOnStatusCode: false,
                ...(data ? { data } : {}),
            });

            const body = await expectRealFailure(response, `${method} ${path}`);

            expect(response.status(), `${method} ${path} should be 401`).toBe(401);
            expect(body.error!.code).toBe('unauthorized');
        });
    }
});

test.describe("a bad request is the caller's fault, and says so", () => {
    test('a body that is not JSON at all', async ({ request }) => {
        const response = await request.post('/api/v1/auth/login', {
            headers: { 'content-type': 'application/json' },
            data: 'this is not json{{{',
            failOnStatusCode: false,
        });

        await expectRealFailure(response, 'a malformed JSON body');
    });

    test('an empty body where fields were required', async ({ request }) => {
        const response = await request.post('/api/v1/auth/login', {
            data: {},
            failOnStatusCode: false,
        });

        await expectRealFailure(response, 'an empty login body');
    });

    test('a password too short to accept', async ({ request }) => {
        const response = await request.post('/api/v1/auth/signup', {
            data: { email: `short-${Date.now()}@pagecraft.test`, password: 'x' },
            failOnStatusCode: false,
        });

        await expectRealFailure(response, 'a too-short password');
    });

    test('an email that is not an email', async ({ request }) => {
        const response = await request.post('/api/v1/auth/signup', {
            data: { email: 'not-an-email', password: 'pagecraft-e2e-123' },
            failOnStatusCode: false,
        });

        await expectRealFailure(response, 'a malformed email');
    });

    test('credentials that do not match', async ({ request }) => {
        const response = await request.post('/api/v1/auth/login', {
            data: { email: 'nobody@pagecraft.test', password: 'definitely-wrong-123' },
            failOnStatusCode: false,
        });

        await expectRealFailure(response, 'a wrong password');
    });

    test('a body far larger than anything legitimate', async ({ request }) => {
        const response = await request.post('/api/v1/auth/login', {
            data: { email: 'a@b.co', password: 'x'.repeat(70_000) },
            failOnStatusCode: false,
        });

        await expectRealFailure(response, 'an oversized body');
    });

    // Malformed ids are checked in signup-to-publish.spec.ts instead of here. withRoute
    // settles authentication before it looks at anything else, so signed out these would
    // answer 401 without the id ever reaching the database — a test that passes without
    // exercising the thing it is named after.
});

test.describe('the browser never sees a raw crash screen', () => {
    test('an address that does not exist is a real page, not a stack trace', async ({ page }) => {
        const response = await page.goto('/definitely-not-a-real-page');

        expect(response?.status()).toBe(404);

        // Next's built-in 404 says only "This page could not be found". Ours explains itself
        // and offers a way back, which is what not-found.tsx exists for.
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const body = (await page.textContent('body')) ?? '';

        expect(body).not.toContain('Application error');
        expect(body).not.toContain('call stack');
        expect(body.length).toBeGreaterThan(60);
    });

    test('an unknown API path is a 404, never a 500', async ({ request }) => {
        const response = await request.get('/api/v1/not-a-real-endpoint', {
            failOnStatusCode: false,
        });

        expect(response.status()).toBe(404);
    });

    // Every reason an auth route can bounce somebody back must put a sentence on the screen.
    // Until D14 only `expired` did, so a failed Google sign-in returned the user to a page
    // that looked completely normal and simply had not worked.
    for (const reason of ['expired', 'google_denied', 'google_failed', 'google_unavailable']) {
        test(`?error=${reason} explains itself`, async ({ page }) => {
            await page.goto(`/signin?error=${reason}`);

            const status = page.getByRole('status');

            await expect(status).toBeVisible();

            const text = (await status.textContent())?.trim() ?? '';

            expect(text.length).toBeGreaterThan(20);
            expect(text).not.toContain('_');
        });
    }

    // The opposite guarantee: a value nobody recognises must not manufacture an alarm.
    test('an invented ?error= says nothing at all', async ({ page }) => {
        await page.goto('/signin?error=completely_made_up');

        await expect(page.getByRole('status')).toHaveCount(0);
    });
});
