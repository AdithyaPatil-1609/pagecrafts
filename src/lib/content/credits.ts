import type { AssetAttribution } from "@/lib/contracts";
import { escapeHtml } from "./slots";

// Photographer credit, in the page footer, written by us (S-1).
//
// Attribution is a system property, not something a site owner is asked to remember: picking
// a photo adds the line, and it is rebuilt from the whole credit list every time rather than
// appended to, so removing a photo removes its credit too.

const CREDITS_BLOCK = /<p\b[^>]*\bdata-credits\b[^>]*>[\s\S]*?<\/p\s*>/i;

export interface PhotoCredit {
  name: string;
  link?: string;
}

export function toCredit(attribution: AssetAttribution): PhotoCredit | null {
  const name = attribution.name?.trim() || attribution.username?.trim();
  if (!name) return null;
  return { name, link: attribution.link?.trim() || undefined };
}

/** The credits already on the page, so a new pick joins them instead of replacing them. */
export function readCredits(html: string): PhotoCredit[] {
  const block = html.match(CREDITS_BLOCK)?.[0];
  if (!block) return [];

  const credits: PhotoCredit[] = [];
  const anchors = block.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi);

  for (const [, href, text] of anchors) {
    const name = text.replace(/<[^>]*>/g, "").trim();
    if (name && !/^unsplash$/i.test(name)) credits.push({ name, link: href || undefined });
  }
  return credits;
}

function renderCredits(credits: PhotoCredit[]): string {
  const names = credits
    .map((credit) =>
      credit.link
        ? `<a href="${escapeHtml(credit.link)}" rel="nofollow noopener" target="_blank">${escapeHtml(credit.name)}</a>`
        : escapeHtml(credit.name),
    )
    .join(", ");

  return `<p class="photo-credits" data-credits>Photos by ${names} on <a href="https://unsplash.com" rel="nofollow noopener" target="_blank">Unsplash</a></p>`;
}

function dedupe(credits: PhotoCredit[]): PhotoCredit[] {
  const seen = new Set<string>();
  return credits.filter((credit) => {
    const key = credit.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Adds one credit to the footer, leaving the page alone when the same photographer is
 * already there. A page with no footer gets none — we do not invent chrome a design chose
 * not to have.
 */
export function addPhotoCredit(html: string, credit: PhotoCredit | null): string {
  if (!credit) return html;

  const credits = dedupe([...readCredits(html), credit]);
  const block = renderCredits(credits);

  if (CREDITS_BLOCK.test(html)) return html.replace(CREDITS_BLOCK, block);

  const footerClose = html.match(/<\/footer\s*>/i);
  if (!footerClose) return html;

  return html.replace(footerClose[0], `  ${block}\n    ${footerClose[0]}`);
}
