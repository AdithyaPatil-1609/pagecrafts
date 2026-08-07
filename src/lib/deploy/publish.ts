import 'server-only';
import type { DeploymentState, PublishFile } from '@/lib/contracts/deploy';
import type { DeployProvider } from './provider';
import { deployConfig } from './config';
import { deployProvider } from './adapters';
import { runOnce } from './idempotency';
import { step } from './log';
import { toPublishError } from './errors';

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
    const ctx = { projectId: input.projectId };
    let stage = 'provisioning';

    onState('pending');

    let siteId = input.siteId ?? null;
    const isNew = siteId === null;

    try {
        if (!siteId) {
            onState('provisioning');
            const site = await step('provisioning', ctx, () =>
                provider.provisionSite({
                    projectId: input.projectId,
                    projectName: input.projectName,
                }),
            );
            siteId = site.siteId;
        }

        const id = siteId;
        const subdomain = id.split('/')[1];
        const url = `https://${subdomain}.${deployConfig.rootDomain}`;
        const siteCtx = { ...ctx, siteId: id };

        stage = 'pushing';
        onState('pushing');
        const { commitSha } = await step('pushing', siteCtx, () =>
            provider.pushBuild(
                id,
                input.files,
                `Publish ${input.projectName} - ${new Date().toISOString()}`,
            ),
        );

        if (isNew) {
            stage = 'enabling_hosting';
            onState('enabling_hosting');
            await step('enabling_hosting', siteCtx, () => provider.enableHosting(id));
        }

        stage = 'verifying';
        onState('verifying');
        const live = await step('verifying', siteCtx, () => provider.verifyLive(url));

        const state: DeploymentState = live ? 'live' : 'pending';
        onState(state);

        return {
            siteId: id,
            subdomain,
            liveUrl: live ? url : null,
            commitSha,
            state,
            error: live ? null : 'verification_timeout',
        };
    } catch (error) {
        onState('failed');
        throw toPublishError(stage, error);
    }
}