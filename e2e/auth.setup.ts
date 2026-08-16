import { test as setup } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { signIn } from './support/sign-in';
import { SEEDED, SECOND, STATE } from './support/users';

// Signing in is rate limited: five attempts per email and ten per IP, per fifteen
// minutes (LOGIN_PER_EMAIL, LOGIN_PER_IP). A suite that signs in before every test
// spends that budget in the first minute and then fails everything afterwards with a
// throttle, which reads as broken auth and is not.
//
// So each user signs in exactly once here, the session cookie is saved, and every spec
// starts already signed in. Two sign-ins for the whole run.

setup.beforeAll(() => mkdirSync('e2e/.auth', { recursive: true }));

setup('sign in as the first seeded user', async ({ page }) => {
    await signIn(page, SEEDED);
    await page.context().storageState({ path: STATE.first });
});

setup('sign in as the second seeded user', async ({ page }) => {
    await signIn(page, SECOND);
    await page.context().storageState({ path: STATE.second });
});
