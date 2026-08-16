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

/** Where a site lives, derived from its id. */
export interface SiteAddress {
  subdomain: string;
  url: string;
}

export interface DeployProvider {
  provisionSite(input: ProvisionInput): Promise<ProvisionResult>;
  /**
   * The address of an already-provisioned site.
   *
   * Each adapter owns the shape of its own site id — one uses `owner/name`, another the
   * bare subdomain — and only the adapter can turn one back into an address. publish() used
   * to do it inline as `siteId.split('/')[1]`, which is one adapter's shape assumed for all
   * of them: against the configured default that index was undefined, so every publish
   * verified and stored `https://undefined.<root domain>` (R3 D17). Asking the adapter is
   * also what NFR-041 requires — nothing outside adapters/ should know these shapes.
   */
  addressFor(siteId: string): SiteAddress;
  pushBuild(siteId: string, files: PublishFile[], message: string): Promise<{ commitSha: string }>;
  enableHosting(siteId: string): Promise<void>;
  verifyLive(url: string): Promise<boolean>;
  removeSite(siteId: string): Promise<void>;
}
