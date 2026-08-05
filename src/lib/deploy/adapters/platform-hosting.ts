import 'server-only';
import type { DeployProvider } from '../provider';

const notYet = (step: string) => async (): Promise<never> => {
    throw new Error(`PlatformHostingAdapter.${step} is built on D2-D3`);
};

export const platformHostingAdapter: DeployProvider = {
    provisionSite: notYet('provisionSite'),
    pushBuild: notYet('pushBuild'),
    enableHosting: notYet('enableHosting'),
    verifyLive: notYet('verifyLive'),
    removeSite: notYet('removeSite'),
};