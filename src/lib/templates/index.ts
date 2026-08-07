import type { Template, TemplateTier } from "@/lib/contracts";
import { aurora } from "./aurora";
import { ember } from "./ember";
import { ledger } from "./ledger";
import { meridian } from "./meridian";

// The template library. Grows on the 10 / 18 / 25 cadence across weeks 1-3.
export const TEMPLATES: Template[] = [aurora, ember, ledger, meridian];

const VALID_TIERS: readonly TemplateTier[] = ["free", "premium", "signature"];
const TIER_PRICE_INR: Record<TemplateTier, number> = {
  free: 0,
  premium: 499,
  signature: 999,
};

// Runtime provenance + pricing check. Returns a list of issues; empty means valid.
// license/source_url are non-null (C-06); tier and its rupee price must line up (Doc 22 P1-P3).
export function validateTemplate(t: Template): string[] {
  const issues: string[] = [];
  if (!t.license.trim()) issues.push("license is required (C-06)");
  if (!t.sourceUrl.trim()) issues.push("source_url is required (C-06)");
  if (!VALID_TIERS.includes(t.tier)) issues.push(`invalid tier: ${t.tier}`);
  else if (t.priceInr !== TIER_PRICE_INR[t.tier]) {
    issues.push(
      `tier ${t.tier} must be priced Rs ${TIER_PRICE_INR[t.tier]}, got Rs ${t.priceInr}`,
    );
  }
  if (t.contentSchema.sections.length === 0) {
    issues.push("contentSchema needs at least one section");
  }
  if (Object.keys(t.files).length === 0) {
    issues.push("template needs at least one file");
  }
  return issues;
}
