import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    test: {
        environment: 'node',
        env: {
            HOSTING_API_BASE: 'https://api.github.com',
            HOSTING_ACCOUNT_ID: 'pagecraft-sites',
            HOSTING_CREDENTIAL_KEY_ID: 'test-key',
            PAGECRAFT_ROOT_DOMAIN: 'pagecrafts.in',
            UPSTASH_REDIS_REST_URL: '',
            UPSTASH_REDIS_REST_TOKEN: '',
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
        },
    },
});