import type { ContentSchema, ContentSection, Field } from "@/lib/contracts";

// The join between structured content and the page the person is looking at.
//
// Templates are generated from blueprints, and every editable value in the markup carries
// `data-slot="<section>.<field>"` — a repeatable list writes one slot per item field
// (`menu.items.0.title`). That attribute is the whole contract: the content panel is drawn
// from `content_schema`, and this module is the only thing that knows how a value in that
// schema reaches the HTML. Nothing here is template-specific (C-07), so a design added
// tomorrow is editable without an editor change.
//
// Values are always escaped on the way in. A person typing `<script>` into a headline gets
// a headline that says `<script>`, in the preview and in the published page alike (C-04).

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The inverse of escapeHtml. `&amp;` is decoded last, or `&amp;lt;` would decode twice.
export function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Markup → the text a person typed: entities decoded, plus the tag stripping a value needs
// when it is read back out of an element that carries inline markup.
export function textFromHtml(inner: string): string {
  return decodeEntities(inner.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "")).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// An element carrying a given slot, captured as open tag / inner / close tag. Slot elements
// never nest another element of the same name inside themselves, so the lazy inner match is
// exact rather than merely usually right.
function slotPattern(path: string): RegExp {
  return new RegExp(
    `(<([a-zA-Z][\\w-]*)\\b[^>]*\\bdata-slot="${escapeRegExp(path)}"[^>]*>)([\\s\\S]*?)(</\\2\\s*>)`,
  );
}

export function readSlotHtml(html: string, path: string): string | null {
  return html.match(slotPattern(path))?.[3] ?? null;
}

/** The slot element's opening tag, where its attributes live. */
export function readSlotOpenTag(html: string, path: string): string | null {
  return html.match(slotPattern(path))?.[1] ?? null;
}

function replaceSlotOpenTag(html: string, path: string, open: string): string {
  return html.replace(slotPattern(path), (_all, _open, _tag, inner: string, close: string) =>
    `${open}${inner}${close}`,
  );
}

export function writeSlotHtml(html: string, path: string, inner: string): string {
  return html.replace(slotPattern(path), (_all, open: string, _tag: string, _old: string, close: string) =>
    `${open}${inner}${close}`,
  );
}

/* ---------------------------------------------------------------- images */

const IMG_TAG = /<img\b[^>]*>/i;

function readImage(inner: string): string | null {
  const tag = inner.match(IMG_TAG)?.[0];
  if (!tag) return null;
  // The attribute is escaped in the markup; the panel and the picker both speak plain URLs.
  const src = tag.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1];
  return src && src.trim() ? decodeEntities(src) : null;
}

// A design ships either a photograph or the code-drawn motif for its category. Swapping the
// photo keeps whatever classes the design put on its `<img>`; filling an empty frame writes
// the same markup the blueprint generator would have.
function writeImage(inner: string, url: string | null, alt: string): string {
  if (url === null) return inner;

  const existing = inner.match(IMG_TAG)?.[0];
  if (existing) {
    const withSrc = existing.match(/\bsrc\s*=\s*"[^"]*"/i)
      ? existing.replace(/\bsrc\s*=\s*"[^"]*"/i, `src="${escapeHtml(url)}"`)
      : existing.replace(/<img\b/i, `<img src="${escapeHtml(url)}"`);

    const withAlt = withSrc.match(/\balt\s*=\s*"[^"]*"/i)
      ? withSrc.replace(/\balt\s*=\s*"[^"]*"/i, `alt="${escapeHtml(alt)}"`)
      : withSrc.replace(/<img\b/i, `<img alt="${escapeHtml(alt)}"`);

    return inner.replace(IMG_TAG, withAlt);
  }

  return `<img class="hero-photo" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`;
}

/* --------------------------------------------------------------- colours */

// A colour is not words on the page, so a colour slot says what it drives:
//
//   <body data-slot="theme.accent" data-slot-var="--accent" style="--accent:#e07a3f">
//
// The template names the custom property, the engine sets it. Without that attribute the
// value is written as text, which is right for a slot that displays a hex code and harmless
// where it does not.
function slotVar(openTag: string): string | null {
  return openTag.match(/\bdata-slot-var="(--[\w-]+)"/i)?.[1] ?? null;
}

function readStyleVar(openTag: string, name: string): string | null {
  const style = openTag.match(/\bstyle\s*=\s*"([^"]*)"/i)?.[1];
  if (!style) return null;

  const found = style.match(new RegExp(`${escapeRegExp(name)}\\s*:\\s*([^;]+)`, "i"))?.[1];
  return found ? decodeEntities(found.trim()) : null;
}

function writeStyleVar(openTag: string, name: string, value: string): string {
  const declaration = `${name}: ${escapeHtml(value)}`;
  const style = openTag.match(/\bstyle\s*=\s*"([^"]*)"/i);

  if (!style) return openTag.replace(/(\s*\/?>)$/, ` style="${declaration}"$1`);

  const pattern = new RegExp(`${escapeRegExp(name)}\\s*:\\s*[^;]*;?\\s*`, "i");
  const next = pattern.test(style[1])
    ? style[1].replace(pattern, `${declaration}; `).trim().replace(/;$/, "")
    : `${style[1].trim().replace(/;$/, "")}; ${declaration}`.replace(/^;\s*/, "");

  return openTag.replace(style[0], `style="${next}"`);
}

/* ----------------------------------------------------------------- lists */

export type ListItem = Record<string, unknown>;

function listPath(sectionKey: string, field: Field): string {
  return `${sectionKey}.${field.key}`;
}

function itemSlot(sectionKey: string, field: Field, index: number, itemKey: string): string {
  return `${listPath(sectionKey, field)}.${index}.${itemKey}`;
}

// Where a list lives in the markup. A rebuilt container is stamped with `data-slot-list`, so
// a list that has been emptied still has a home to grow back into; a container that has
// never been rewritten is found from the item slots inside it, which is what every template
// generated before that stamp existed looks like.
function findListContainer(
  html: string,
  sectionKey: string,
  field: Field,
): { start: number; end: number; inner: string; open: string } | null {
  const path = listPath(sectionKey, field);

  const stamped = html.match(
    new RegExp(`<ul\\b[^>]*\\bdata-slot-list="${escapeRegExp(path)}"[^>]*>[\\s\\S]*?</ul\\s*>`),
  );
  if (stamped?.index !== undefined) {
    const open = stamped[0].match(/<ul\b[^>]*>/)![0];
    return {
      start: stamped.index,
      end: stamped.index + stamped[0].length,
      open,
      inner: stamped[0].slice(open.length, -"</ul>".length),
    };
  }

  const anchor = html.indexOf(`data-slot="${path}.`);
  if (anchor === -1) return null;

  const start = html.lastIndexOf("<ul", anchor);
  const closeAt = html.indexOf("</ul>", anchor);
  if (start === -1 || closeAt === -1) return null;

  const end = closeAt + "</ul>".length;
  const open = html.slice(start).match(/<ul\b[^>]*>/)?.[0];
  if (!open) return null;

  return { start, end, open, inner: html.slice(start + open.length, closeAt) };
}

function readListItems(inner: string, sectionKey: string, field: Field): ListItem[] {
  const items: ListItem[] = [];
  const itemSchema = field.itemSchema ?? [];

  for (let index = 0; ; index++) {
    const values: ListItem = {};
    let found = false;

    for (const itemField of itemSchema) {
      const raw = readSlotHtml(inner, itemSlot(sectionKey, field, index, itemField.key));
      if (raw === null) {
        values[itemField.key] = "";
        continue;
      }
      found = true;
      values[itemField.key] = textFromHtml(raw);
    }

    if (!found) return items;
    items.push(values);
  }
}

// One item's markup: the first field is its title, the rest read as body copy. That is the
// shape the blueprint generator emits, so a rebuilt list is indistinguishable from the
// original one — no design gets a second look because it was edited.
function renderItem(sectionKey: string, field: Field, index: number, item: ListItem): string {
  const itemSchema = field.itemSchema ?? [];

  const lines = itemSchema.map((itemField, position) => {
    const slot = itemSlot(sectionKey, field, index, itemField.key);
    const value = escapeHtml(String(item[itemField.key] ?? ""));
    const tag = position === 0 ? "h3" : "p";
    return `          <${tag} data-slot="${slot}">${value}</${tag}>`;
  });

  return `        <li class="card">\n${lines.join("\n")}\n        </li>`;
}

function renderList(sectionKey: string, field: Field, items: ListItem[]): string {
  const path = listPath(sectionKey, field);
  const body = items.map((item, index) => renderItem(sectionKey, field, index, item)).join("\n");

  return `<ul class="cards" data-slot-list="${path}">\n${body}${body ? "\n" : ""}      </ul>`;
}

function writeList(html: string, sectionKey: string, field: Field, items: ListItem[]): string {
  const found = findListContainer(html, sectionKey, field);
  if (!found) return html;

  return html.slice(0, found.start) + renderList(sectionKey, field, items) + html.slice(found.end);
}

/* --------------------------------------------------------------- reading */

/**
 * A blank item, shaped by the list's `itemSchema`. What "Add another" starts from.
 */
export function emptyListItem(field: Field): ListItem {
  const item: ListItem = {};
  for (const itemField of field.itemSchema ?? []) item[itemField.key] = "";
  return item;
}

function readField(html: string, section: ContentSection, field: Field): unknown {
  if (field.type === "list") {
    const found = findListContainer(html, section.key, field);
    return found ? readListItems(found.inner, section.key, field) : [];
  }

  const path = `${section.key}.${field.key}`;
  const inner = readSlotHtml(html, path);
  if (inner === null) return field.type === "image" ? null : "";

  if (field.type === "image") return readImage(inner);

  if (field.type === "color") {
    const open = readSlotOpenTag(html, path) ?? "";
    const name = slotVar(open);
    return (name ? readStyleVar(open, name) : null) ?? textFromHtml(inner);
  }

  return textFromHtml(inner);
}

/**
 * The values the page is showing right now, keyed by schema.
 *
 * A freshly forked project has an empty `content_json` — everything it says lives in the
 * markup it copied from its template. Reading the page back is what lets the panel open on
 * the real words rather than on a screen of empty boxes.
 */
export function readContentFromHtml(
  html: string,
  schema: ContentSchema,
): Record<string, Record<string, unknown>> {
  const content: Record<string, Record<string, unknown>> = {};

  for (const section of schema.sections) {
    const values: Record<string, unknown> = {};
    for (const field of section.fields) values[field.key] = readField(html, section, field);
    content[section.key] = values;
  }

  return content;
}

/**
 * Stored content laid over what the markup says, so a slot the owner has never touched
 * keeps the template's words instead of going blank.
 */
export function mergeContent(
  fromHtml: Record<string, Record<string, unknown>>,
  stored: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const merged: Record<string, Record<string, unknown>> = {};

  for (const [sectionKey, fields] of Object.entries(fromHtml)) {
    const storedSection = (stored[sectionKey] ?? {}) as Record<string, unknown>;
    const values: Record<string, unknown> = { ...fields };

    for (const [fieldKey, value] of Object.entries(storedSection)) {
      if (value !== undefined && fieldKey in fields) values[fieldKey] = value;
    }

    merged[sectionKey] = values;
  }

  return merged;
}

/* --------------------------------------------------------------- writing */

/**
 * One content value into the page. `path` is the dotted slot the content panel and
 * `PATCH /content` both speak — "hero.headline", or "menu.items" for a whole list.
 *
 * Returns the HTML unchanged when the slot is not in this page: a template may legitimately
 * describe a field its markup does not render, and losing the rest of the edit over that
 * would be the worse failure.
 */
export function applySlotValue(
  html: string,
  schema: ContentSchema,
  path: string,
  value: unknown,
): string {
  const [sectionKey, fieldKey] = path.split(".");
  const section = schema.sections.find((s) => s.key === sectionKey);
  const field = section?.fields.find((f) => f.key === fieldKey);
  if (!section || !field) return html;

  if (field.type === "list") {
    return writeList(html, section.key, field, Array.isArray(value) ? (value as ListItem[]) : []);
  }

  const slot = `${section.key}.${field.key}`;
  const inner = readSlotHtml(html, slot);
  if (inner === null) return html;

  if (field.type === "image") {
    const url = typeof value === "string" && value.trim() ? value : null;
    return writeSlotHtml(html, slot, writeImage(inner, url, field.label));
  }

  if (field.type === "color") {
    const open = readSlotOpenTag(html, slot);
    const name = open ? slotVar(open) : null;
    if (open && name) {
      return replaceSlotOpenTag(html, slot, writeStyleVar(open, name, String(value ?? "")));
    }
  }

  return writeSlotHtml(html, slot, escapeHtml(String(value ?? "")));
}

/** Every value in a content map into the page, in schema order. */
export function applyContentToHtml(
  html: string,
  schema: ContentSchema,
  content: Record<string, Record<string, unknown>>,
): string {
  let out = html;

  for (const section of schema.sections) {
    const values = content[section.key] ?? {};
    for (const field of section.fields) {
      if (!(field.key in values)) continue;
      out = applySlotValue(out, schema, `${section.key}.${field.key}`, values[field.key]);
    }
  }

  return out;
}

/**
 * Which of a schema's fields this page actually has somewhere to put.
 *
 * A design can advertise a field its markup does not render — an older project forked before
 * the design gained a slot, or a schema edited past its template. Editing such a field would
 * change `content_json` and move nothing on screen, which reads as the editor being broken.
 * The panel asks this so it can say so instead.
 */
export function boundSlotPaths(html: string, schema: ContentSchema): Set<string> {
  const bound = new Set<string>();

  for (const section of schema.sections) {
    for (const field of section.fields) {
      const path = `${section.key}.${field.key}`;
      const present =
        field.type === "list"
          ? findListContainer(html, section.key, field) !== null
          : readSlotHtml(html, path) !== null;

      if (present) bound.add(path);
    }
  }

  return bound;
}

/** The schema field a dotted slot path names, or undefined when the path is unknown. */
export function fieldAt(schema: ContentSchema, path: string): Field | undefined {
  const [sectionKey, fieldKey] = path.split(".");
  return schema.sections
    .find((s) => s.key === sectionKey)
    ?.fields.find((f) => f.key === fieldKey);
}
