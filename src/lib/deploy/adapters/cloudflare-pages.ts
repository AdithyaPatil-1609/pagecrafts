import 'server-only';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PublishFile } from '@/lib/contracts/deploy';
import type { DeployProvider, ProvisionInput, ProvisionResult } from '../provider';
import { deployConfig } from '../config';
import { readDeployCredential } from '../credentials';
import { uniqueSlug } from '../slug';
import { pollUntilLive } from '../verify';
import { cf, accountPath } from './cloudflare-client';
import { HostingError } from './hosting-error';

const exec = promisify(execFile);

const WRANGLER = join(
    process.cwd(),
    'node_modules',
    'wrangler',
    'bin',
    'wrangler.js',
);

async function projectExists(name: string): Promise<boolean> {
    try {
        await cf('GET', accountPath(`/pages/projects/${name}`));
        return true;
    } catch (error) {
        if (error instanceof HostingError && error.status === 404) return false;
        throw error;
    }
}

export const cloudflarePagesAdapter: DeployProvider = {
    async provisionSite({ projectName }: ProvisionInput): Promise<ProvisionResult> {
        const subdomain = await uniqueSlug(projectName, projectExists);

        await cf('POST', accountPath('/pages/projects'), {
            name: subdomain,
            production_branch: 'main',
        });

        return {
            siteId: subdomain,
            subdomain,
            predictedUrl: `https://${subdomain}.${deployConfig().rootDomain}`,
        };
    },

    // Cloudflare Pages projects are named by the subdomain itself, so the id is the address.
    addressFor(siteId: string) {
        return {
            subdomain: siteId,
            url: `https://${siteId}.${deployConfig().rootDomain}`,
        };
    },

    async pushBuild(siteId: string, files: PublishFile[]) {
        const dir = await mkdtemp(join(tmpdir(), 'pagecraft-'));

        try {
            for (const file of files) {
                const target = join(dir, file.path);
                await mkdir(dirname(target), { recursive: true });
                await writeFile(
                    target,
                    file.encoding === 'base64'
                        ? Buffer.from(file.content, 'base64')
                        : file.content,
                );
            }

            const { stdout } = await exec(
                process.execPath,
                [
                    WRANGLER,
                    'pages',
                    'deploy',
                    dir,
                    '--project-name',
                    siteId,
                    '--branch',
                    'main',
                ],
                {
                    env: {
                        ...process.env,
                        CLOUDFLARE_API_TOKEN: readDeployCredential(),
                        CLOUDFLARE_ACCOUNT_ID: deployConfig().accountId,
                    },
                    maxBuffer: 10_000_000,
                },
            );

            const id = /https:\/\/([0-9a-f]{8})\./.exec(stdout)?.[1] ?? 'deployed';
            return { commitSha: id };
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    },

    async enableHosting(siteId: string): Promise<void> {
        const domain = `${siteId}.${deployConfig().rootDomain}`;

        try {
            await cf('POST', accountPath(`/pages/projects/${siteId}/domains`), {
                name: domain,
            });
        } catch (error) {
            if (!(error instanceof HostingError && error.status === 409)) throw error;
        }
    },

    async verifyLive(url: string): Promise<boolean> {
        return pollUntilLive(url);
    },

    async removeSite(siteId: string): Promise<void> {
        await cf('DELETE', accountPath(`/pages/projects/${siteId}`));
    },
}; 