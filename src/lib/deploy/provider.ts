import type { PublishFile } from '@/lib/contracts/deploy';

export interface ProvisionInput {
  projectId: string;
  projectName: string;
}

export interface ProvisionResult {
  siteId: string;
  subdomain: string;
  predictedUrl: string;
}

export interface DeployProvider {
  provisionSite(input: ProvisionInput): Promise<ProvisionResult>;
  pushBuild(siteId: string, files: PublishFile[], message: string): Promise<{ commitSha: string }>;
  enableHosting(siteId: string): Promise<void>;
  verifyLive(url: string): Promise<boolean>;
  removeSite(siteId: string): Promise<void>;
}
