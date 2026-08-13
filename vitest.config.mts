import { defineConfig, configDefaults } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    test: {
        environment: 'node',
        // A git worktree under .claude/ is a second complete checkout of this
        // repo. Left in scope it doubles the run — every test executes twice,
        // once against a different commit — and the second copy's failures read
        // as failures here. Excluded so a worktree open in the background cannot
        // change what `npm test` reports.
        exclude: [...configDefaults.exclude, '**/.claude/worktrees/**', '**/.next/**'],
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