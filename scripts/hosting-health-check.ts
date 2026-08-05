import { hosting } from '@/lib/deploy/hosting-client';

async function main() {
    const account = await hosting.whoami();
    console.log('authenticated as', account.name, `(${account.id})`);
}

main().catch((err) => {
    console.error('health check failed:', err.message);
    process.exit(1);
});