import 'server-only';
import type { DeploymentState, PublishFile } from '@/lib/contracts/deploy';
import type { DeployProvider } from './provider';
import { deployConfig } from './config';
import { deployProvider } from './adapters';
import { runOnce } from './idempotency';

export interface PublishInput {
    projectId: string;
    projectName: string;
    files: PublishFile[];
    siteId?: string | null;
    idempotencyKey: string;
}

export interface PublishResult {
    siteId: string;
    subdomain: string;
    liveUrl: string | null;
    commitSha: string;
    state: DeploymentState;
    error: string | null;
}

export function publish(
    input: PublishInput,
    onState: (state: DeploymentState) => void = () => { },
    provider: DeployProvider = deployProvider,
): Promise<PublishResult> {
    return runOnce(input.idempotencyKey, () => run(input, onState, provider));
}

async function run(
    input: PublishInput,
    onState: (state: DeploymentState) => void,
    provider: DeployProvider,
): Promise<PublishResult> {
    onState('pending');

    let siteId = input.siteId ?? null;
    const isNew = siteId === null;

    if (!siteId) {
        onState('provisioning');
        const site = await provider.provisionSite({
            projectId: input.projectId,
            projectName: input.projectName,
        });
        siteId = site.siteId;
    }

    const subdomain = siteId.split('/')[1];
    const url = `https://${subdomain}.${deployConfig.rootDomain}`;

    onState('pushing');
    const { commitSha } = await provider.pushBuild(
        siteId,
        input.files,
        `Publish ${input.projectName} - ${new Date().toISOString()}`,
    );

    if (isNew) {
        onState('enabling_hosting');
        await provider.enableHosting(siteId);
    }

    onState('verifying');
    const live = await provider.verifyLive(url);

    const state: DeploymentState = live ? 'live' : 'failed';
    onState(state);

    return {
        siteId,
        subdomain,
        liveUrl: live ? url : null,
        commitSha,
        state,
        error: live ? null : 'hosting_timeout',
    };
}