import type { SiteMeta } from "@/lib/contracts";
import { escapeHtml } from "./slots";

// Site settings into the page: the title and description a search result shows, the icon in
// the tab, the card a link unfurls into, and the address a contact form posts to.
//
// These are project columns rather than content slots — `site_meta` and `form_endpoint` on
// `projects` — so they are edited once for the whole site and written into `<head>` and into
// every form, not into a band of the page (S-2, S-3, S-4).

export interface SiteSettings {
  meta: SiteMeta;
  /** Resolved image URLs for the two asset-backed meta fields, when they are set. */
  faviconUrl?: string | null;
  ogImageUrl?: string | null;
  formEndpoint: string | null;
}

function upsertHead(html: string, pattern: RegExp, tag: string | null): string {
  const existing = html.match(pattern);

  if (existing) {
    return tag === null ? html.replace(pattern, "") : html.replace(pattern, tag);
  }
  if (tag === null) return html;

  const head = html.match(/<head[^>]*>/i);
  return head ? html.replace(head[0], `${head[0]}\n    ${tag}`) : `${tag}\n${html}`;
}

function metaTag(name: "name" | "property", key: string, value: string | null | undefined) {
  const clean = value?.trim();
  return clean ? `<meta ${name}="${key}" content="${escapeHtml(clean)}" />` : null;
}

function metaPattern(name: "name" | "property", key: string): RegExp {
  return new RegExp(`<meta\\b[^>]*\\b${name}\\s*=\\s*"${key}"[^>]*>`, "i");
}

/**
 * The `<head>` half. A field left blank removes its tag rather than emitting an empty one —
 * a bare `<meta name="description" content="">` is worse for a search result than none.
 */
export function applySiteMetaToHtml(html: string, settings: SiteSettings): string {
  const { meta } = settings;
  let out = html;

  const title = meta.title?.trim();
  if (title) {
    out = out.match(/<title>[\s\S]*?<\/title>/i)
      ? out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
      : upsertHead(out, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  }

  out = upsertHead(out, metaPattern("name", "description"), metaTag("name", "description", meta.description));
  out = upsertHead(out, metaPattern("property", "og:title"), metaTag("property", "og:title", meta.title));
  out = upsertHead(
    out,
    metaPattern("property", "og:description"),
    metaTag("property", "og:description", meta.description),
  );
  out = upsertHead(
    out,
    metaPattern("property", "og:image"),
    metaTag("property", "og:image", settings.ogImageUrl),
  );

  const favicon = settings.faviconUrl?.trim();
  out = upsertHead(
    out,
    /<link\b[^>]*\brel\s*=\s*"icon"[^>]*>/i,
    favicon ? `<link rel="icon" href="${escapeHtml(favicon)}" />` : null,
  );

  return out;
}

const FORM_BLOCK = /<form\b[^>]*>[\s\S]*?<\/form\s*>/gi;

function setAction(openTag: string, endpoint: string | null): string {
  const action = endpoint ? escapeHtml(endpoint) : "";
  return openTag.match(/\baction\s*=\s*"[^"]*"/i)
    ? openTag.replace(/\baction\s*=\s*"[^"]*"/i, `action="${action}"`)
    : openTag.replace(/<form\b/i, `<form action="${action}"`);
}

function setDisabled(block: string, disabled: boolean): string {
  return block.replace(/<(input|button|textarea|select)\b[^>]*>/gi, (tag) => {
    const withoutFlag = tag.replace(/\s+disabled(?:="[^"]*")?/gi, "");
    if (!disabled) return withoutFlag;
    return withoutFlag.replace(/\s*\/?>$/, (end) => ` disabled${end}`);
  });
}

/**
 * The form half (S-2). A template ships `action=""` on purpose — it must never carry a
 * third-party destination — so the owner's endpoint is filled in here.
 *
 * With no endpoint the form is rendered disabled rather than left live: a contact form that
 * silently posts nowhere is the one failure a site owner cannot see for themselves.
 */
export function applyFormEndpointToHtml(html: string, endpoint: string | null): string {
  return html.replace(FORM_BLOCK, (block) => {
    const open = block.match(/<form\b[^>]*>/i)?.[0] ?? "";
    const rest = block.slice(open.length);
    return setAction(open, endpoint) + setDisabled(rest, endpoint === null);
  });
}

export function applySettingsToHtml(html: string, settings: SiteSettings): string {
  return applyFormEndpointToHtml(applySiteMetaToHtml(html, settings), settings.formEndpoint);
}

/** True when this page has a contact form for the endpoint field to matter to. */
export function hasContactForm(html: string): boolean {
  return /<form\b/i.test(html);
}
