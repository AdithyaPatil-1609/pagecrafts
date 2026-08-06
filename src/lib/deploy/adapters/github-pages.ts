import 'server-only';
import type { DeployProvider, ProvisionInput, ProvisionResult } from '../provider';
import { deployConfig } from '../config';
import { uniqueSlug } from '../slug';
import { gh, HostingError } from './github-client';

const org = deployConfig.accountId;

async function repoExists(name: string): Promise<boolean> {
    try {
        await gh('GET', `/repos/${org}/${name}`);
        return true;
    } catch (error) {
        if (error instanceof HostingError && error.status === 404) return false;
        throw error;
    }
}

const notYet = (step: string) => async (): Promise<never> => {
    throw new Error(`GitHubPagesAdapter.${step} is built on D3`);
};

export const githubPagesAdapter: DeployProvider = {
    async provisionSite({ projectId, projectName }: ProvisionInput): Promise<ProvisionResult> {
        const subdomain = await uniqueSlug(projectName, repoExists);

        await gh('POST', `/orgs/${org}/repos`, {
            name: subdomain,
            description: `PageCraft site ${projectId}`,
            auto_init: true,
            private: false,
        });

        return {
            siteId: `${org}/${subdomain}`,
            subdomain,
            predictedUrl: `https://${subdomain}.${deployConfig.rootDomain}`,
        };
    },

    async enableHosting(siteId: string): Promise<void> {
        const [owner, repo] = siteId.split('/');
        const domain = `${repo}.${deployConfig.rootDomain}`;

        await gh('PUT', `/repos/${owner}/${repo}/contents/CNAME`, {
            message: 'Set custom domain',
            content: Buffer.from(`${domain}\n`).toString('base64'),
        });

        await gh('POST', `/repos/${owner}/${repo}/pages`, {
            source: { branch: 'main', path: '/' },
        });

        try {
            await gh('PUT', `/repos/${owner}/${repo}/pages`, {
                cname: domain,
                https_enforced: true,
            });
        } catch {
            // certificate not issued yet; D3 verification retries this
        }
    },

    async removeSite(siteId: string): Promise<void> {
        const [owner, repo] = siteId.split('/');
        await gh('DELETE', `/repos/${owner}/${repo}`);
    },

    pushBuild: notYet('pushBuild'),
    verifyLive: notYet('verifyLive'),
};