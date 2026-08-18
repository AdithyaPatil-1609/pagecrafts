import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// The specs read the same .env.local the app is built from — the service role key that
// grants a publish entitlement, and the Supabase URL to reach with it. Without this the
// runner sees neither and the publish walk skips itself for a credential that is right
// there on disk. Existing values win, so `E2E_WITH_AUTH=1 npm run e2e` still overrides.
loadEnv({ path: '.env.local', override: false, quiet: true });

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const REUSE = !process.env.CI && !process.env.E2E_BASE_URL;

export default defineConfig({
    testDir: './e2e',
    outputDir: './e2e/.results',
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    timeout: 45_000,
    expect: { timeout: 10_000 },
    reporter: process.env.CI
        ? [['github'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]]
        : [['list']],
    use: {
        baseURL: BASE_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
    },
    projects: [
        // Signing in is rate limited, so it happens twice for the whole run and every
        // spec reuses the saved session. See e2e/auth.setup.ts.
        { name: 'setup', testMatch: /auth\.setup\.ts/ },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            dependencies: process.env.E2E_WITH_AUTH === '1' ? ['setup'] : [],
        },
    ],
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : {
              command: `npx next start --port ${PORT}`,
              url: BASE_URL,
              reuseExistingServer: REUSE,
              timeout: 120_000,
              stdout: 'pipe',
              stderr: 'pipe',
          },
});
