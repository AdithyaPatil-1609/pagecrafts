import type { DeployProvider } from '../provider';
import { cloudflarePagesAdapter } from './cloudflare-pages';
import { githubPagesAdapter } from './github-pages';

const adapters: Record<string, DeployProvider> = {
    cloudflare: cloudflarePagesAdapter,
    github: githubPagesAdapter,
};

export const deployProvider: DeployProvider =
    adapters[process.env.HOSTING_PROVIDER ?? 'cloudflare'] ?? cloudflarePagesAdapter;