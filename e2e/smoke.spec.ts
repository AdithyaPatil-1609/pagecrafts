import { test, expect } from '@playwright/test';

test.describe('the app is up', () => {
    test('serves the landing page with a way in', async ({ page }) => {
        const response = await page.goto('/');

        expect(response?.status()).toBe(200);
        await expect(page).toHaveTitle(/pagecraft/i);
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
    });

    test('shows the template gallery without signing in', async ({ page }) => {
        await page.goto('/templates');

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('the health route answers', async ({ request }) => {
        const response = await request.get('/api/v1/health');

        expect(response.status()).toBe(200);
    });

    test('an unauthenticated API call is refused with the envelope, not a crash', async ({ request }) => {
        const response = await request.get('/api/v1/auth/me');
        const body = await response.json();

        expect(response.status()).toBe(401);
        expect(body).toMatchObject({ ok: false, error: { code: 'unauthorized' } });
        expect(typeof body.error.message).toBe('string');
    });

    test('an oversized body is refused, not swallowed (D10)', async ({ request }) => {
        const response = await request.post('/api/v1/auth/login', {
            data: { email: 'a@b.co', password: 'x'.repeat(70_000) },
            failOnStatusCode: false,
        });

        expect([401, 413, 422]).toContain(response.status());

        const body = await response.json();
        expect(body.ok).toBe(false);
    });
});
