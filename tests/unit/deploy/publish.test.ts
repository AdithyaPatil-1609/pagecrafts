import { describe, it, expect, vi } from 'vitest';
import { publish } from '@/lib/deploy/publish';
import type { DeployProvider } from '@/lib/deploy/provider';

function fakeProvider(live = true): DeployProvider {
    return {
        provisionSite: async () => ({
            siteId: 'pagecraft-sites/spike',
            subdomain: 'spike',
            predictedUrl: 'https://spike.pagecrafts.in',
        }),
        addressFor: (siteId: string) => {
            const subdomain = siteId.split('/').pop() ?? siteId;
            return { subdomain, url: `https://${subdomain}.pagecrafts.in` };
        },
        pushBuild: async () => ({ commitSha: 'commit-1' }),
        enableHosting: async () => { },
        verifyLive: async () => live,
        removeSite: async () => { },
    };
}

const input = {
    projectId: 'p1',
    projectName: 'Spike',
    files: [{ path: 'index.html', content: '<h1>hi</h1>', encoding: 'utf-8' as const }],
};

describe('publish', () => {
    it('walks the stages in order and returns a live url', async () => {
        const states: string[] = [];
        const result = await publish(
            { ...input, idempotencyKey: 'k1' },
            (s) => states.push(s),
            fakeProvider(true),
        );

        expect(states).toEqual([
            'pending',
            'provisioning',
            'pushing',
            'enabling_hosting',
            'verifying',
            'live',
        ]);
        expect(result.liveUrl).toBe('https://spike.pagecrafts.in');
        expect(result.commitSha).toBe('commit-1');
    });

    it('stays verifying with no url when verification times out', async () => {
        // Was `pending` until R3 D17. That is the state an attempt *starts* in, so a site
        // that had been provisioned, pushed and hosted reported the same thing as one that
        // had done nothing at all — and a resume needs to be able to tell them apart. See
        // tests/unit/deploy/publish-edges.test.ts for the rest of that case.
        const result = await publish(
            { ...input, idempotencyKey: 'k2' },
            () => { },
            fakeProvider(false),
        );

        expect(result.state).toBe('verifying');
        expect(result.liveUrl).toBeNull();
        expect(result.pendingUrl).toBe('https://spike.pagecrafts.in');
        expect(result.reason).toBe('not_answering_yet');
    });

    it('still attaches hosting when republishing', async () => {
        // siteId is remembered even after a failed first push; skipping enableHosting
        // left orphan Pages projects with no DNS (522 / NXDOMAIN).
        const provider = fakeProvider(true);
        const enable = vi.spyOn(provider, 'enableHosting');

        await publish(
            { ...input, siteId: 'pagecraft-sites/spike', idempotencyKey: 'k3' },
            () => { },
            provider,
        );

        expect(enable).toHaveBeenCalledOnce();
    });
});