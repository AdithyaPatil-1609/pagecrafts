import { deployProvider } from '@/lib/deploy/adapters';

const name = process.argv[2] ?? 'Spike Site';
const cleanup = process.argv.includes('--cleanup');

async function main() {
    const site = await deployProvider.provisionSite({
        projectId: 'spike',
        projectName: name,
    });
    console.log('provisioned :', site.siteId);
    console.log('subdomain   :', site.subdomain);

    await deployProvider.enableHosting(site.siteId);
    console.log('hosting     : enabled');
    console.log('address     :', site.predictedUrl);

    if (cleanup) {
        await deployProvider.removeSite(site.siteId);
        console.log('removed     :', site.siteId);
    }
}

main().catch((err) => {
    console.error('spike failed:', err.message);
    process.exit(1);
});