import { expect, type Page } from '@playwright/test';

export interface NewAccount {
    email: string;
    password: string;
    name: string;
}

/**
 * An account nobody has used before.
 *
 * A fixed address would pass once and then fail for the rest of the day with
 * "already registered", so every run invents its own. `@pagecraft.test` is not a real
 * domain — nothing here can send mail to a person by accident.
 */
export function newAccount(): NewAccount {
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    return {
        email: `e2e-${unique}@pagecraft.test`,
        password: 'pagecraft-e2e-123',
        name: 'E2E Walker',
    };
}

/**
 * Register through the panel a real person uses, not the API behind it.
 *
 * Lands on /new when confirmation is off (as it is locally — supabase/config.toml sets
 * enable_confirmations = false) and on /verify when it is on. Both are a successful signup;
 * the caller is told which so it can decide whether the rest of the walk is possible.
 */
export async function signUp(page: Page, who: NewAccount): Promise<'signed-in' | 'needs-email'> {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /get started today/i })).toBeVisible();

    await page.locator('#name').fill(who.name);
    await page.locator('#email').fill(who.email);
    await page.locator('#password').fill(who.password);
    await page.locator('#confirmPassword').fill(who.password);

    await page.getByRole('button', { name: /create my site/i }).click();

    await page.waitForURL(/\/(new|verify)/, { timeout: 20_000 });

    return page.url().includes('/verify') ? 'needs-email' : 'signed-in';
}
