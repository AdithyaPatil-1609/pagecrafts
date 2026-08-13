import { defineConfig, devices } from '@playwright/test';

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
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
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
