import { gh } from '@/lib/deploy/adapters/github-client';
import { deployConfig } from '@/lib/deploy/config';

async function main() {
    const { data } = await gh<{ login: string; id: number }>(
        'GET',
        `/orgs/${deployConfig.accountId}`,
    );
    console.log('authenticated against org', data.login, `(id ${data.id})`);
}

main().catch((err) => {
    console.error('health check failed:', err.message);
    if (err.cause) console.error('cause:', err.cause);
    process.exit(1);
});