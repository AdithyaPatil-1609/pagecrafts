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

// Signing in needs Upstash, because the login route is rate limited and the limiter has to
// be able to reach Redis to let anybody through. Every spec that uses a session already
// skips itself when E2E_WITH_AUTH is unset — this setup did not, so on a run without the
// secret the twenty-six auth tests skipped exactly as intended and the two setups failed
// anyway, reddening a job in which nothing had actually gone wrong.
//
// The gate is the one the D14 note describes: "anything needing Upstash, hosting or a
// service role skips rather than fails, so the gate is never red for a secret somebody's
// fork does not have." This is that, applied to the step the rest of them depend on.
const withAuth = process.env.E2E_WITH_AUTH === '1';

setup.beforeAll(() => mkdirSync('e2e/.auth', { recursive: true }));

setup('sign in as the first seeded user', async ({ page }) => {
    setup.skip(!withAuth, 'needs Upstash: set E2E_WITH_AUTH=1');
    await signIn(page, SEEDED);
    await page.context().storageState({ path: STATE.first });
});

setup('sign in as the second seeded user', async ({ page }) => {
    setup.skip(!withAuth, 'needs Upstash: set E2E_WITH_AUTH=1');
    await signIn(page, SECOND);
    await page.context().storageState({ path: STATE.second });
});
