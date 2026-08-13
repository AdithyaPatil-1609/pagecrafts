import { expect, type Page } from '@playwright/test';
import { SEEDED } from './users';

export async function signIn(
    page: Page,
    who: { email: string; password: string } = SEEDED,
): Promise<void> {
    await page.goto('/');

    await page.getByRole('button', { name: /already have an account\?\s*sign in|^sign in$/i })
        .first()
        .click();

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.locator('#email').fill(who.email);
    await page.locator('#password').fill(who.password);

    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/new/, { timeout: 20_000 });
}
