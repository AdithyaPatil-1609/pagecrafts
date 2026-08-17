import { SECTION_KEYS, type Composition, type SectionInstance, type SectionKey } from '@/lib/contracts';
import { compositionShell } from './page-shell';
import { SITE_NAV_CSS, siteNavHtml } from './site-chrome';

const KNOWN = new Set<string>(SECTION_KEYS);

/**
 * Deterministic HTML for a composition (AC-F4-10 / TC-126).
 *
 * Unknown types are omitted — the publish path, not the editor placeholder.
 * Images are local colour blocks keyed on `query`/`alt`; no network, so a
 * re-render is byte-identical and Playwright can screenshot offline.
 */
export function compositionToHtml(composition: Composition): string {
    const sections = composition.sections
        .filter((s) => s.visible !== false)
        .filter((s) => KNOWN.has(s.type));
    const contactId = sections.find((s) => s.type === 'contact')?.id ?? 'contact';
    const markup = sections.map((s, i) => renderSection(s, i, contactId)).join('\n');

    return compositionShell({
        title: esc(composition.meta.title || composition.vertical),
        description: esc(composition.meta.description || ''),
        lang: esc(composition.meta.lang || 'en'),
        artDirection: composition.artDirection,
        body: `<style>${LAYOUT_CSS}</style>\n${siteNavHtml(composition)}\n<main>\n${markup}\n</main>`,
    });
}

const LAYOUT_CSS = `
main { max-width: 72rem; margin: 0 auto; padding: 0 1.5rem; }
${SITE_NAV_CSS}
.hero { display: grid; gap: var(--stack-gap); align-items: center; }
.hero.split-image, .hero.media-split, .about.media-split, .contact.split-map {
  grid-template-columns: 1fr 1fr;
}
.hero.centred, .hero.minimal { text-align: center; justify-items: center; }
.hero.image-bg { position: relative; min-height: 22rem; }
.kicker { color: var(--muted); font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase; }
.cta {
  display: inline-block; margin-top: 1rem; padding: 0.7rem 1.2rem;
  background: var(--accent); color: var(--accent-ink); border-radius: var(--radius-md);
  text-decoration: none; font-weight: 600;
}
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: var(--stack-gap); }
.card, .quote, .faq-item, .menu-item, .person {
  background: var(--panel); border: var(--border-width) solid var(--rule);
  border-radius: var(--radius-md); padding: 1.25rem;
}
.ph {
  display: grid; place-items: center; min-height: 12rem; margin: 0;
  background: var(--panel); color: var(--muted); border-radius: var(--radius-md);
  border: var(--border-width) solid var(--rule); font-size: 0.85rem; text-align: center; padding: 1rem;
}
.footer { border-top: var(--border-width) solid var(--rule); color: var(--muted); }
@media (max-width: 720px) {
  .hero.split-image, .hero.media-split, .about.media-split, .contact.split-map {
    grid-template-columns: 1fr;
  }
}
`.replace(/\s+/g, ' ').trim();

function renderSection(section: SectionInstance, index: number, contactId: string): string {
    const type = section.type as SectionKey;
    const props = section.props ?? {};
    const cls = `${type} ${escAttr(section.variant)}`;
    const inner = type === 'hero'
        ? heroHtml(props, section.variant, contactId)
        : SECTION_HTML[type](props, section.variant);
    return `<section id="${escAttr(section.id)}" class="${cls}" data-section="${escAttr(type)}" data-index="${index}">${inner}</section>`;
}

type Props = Record<string, unknown>;

function heroHtml(p: Props, variant: string, contactId: string): string {
    const copy = [
        p.eyebrow ? `<p class="kicker">${esc(str(p.eyebrow))}</p>` : '',
        heading(p.heading, 'h1'),
        p.sub ? `<p>${esc(str(p.sub))}</p>` : '',
        p.ctaLabel ? `<a class="cta" href="#${escAttr(contactId)}">${esc(str(p.ctaLabel))}</a>` : '',
    ].join('');
    const pic = figure(p.image);
    if (variant === 'split-image') return `<div>${copy}</div>${pic}`;
    if (variant === 'image-bg') return `${pic}${copy}`;
    return copy + pic;
}

const SECTION_HTML: Record<Exclude<SectionKey, 'hero'>, (p: Props, variant: string) => string> = {
    about: (p, variant) => {
        const copy = heading(p.heading) + (p.body ? `<p>${esc(str(p.body))}</p>` : '');
        return variant === 'media-split' ? `<div>${copy}</div>${figure(p.image)}` : copy + figure(p.image);
    },
    services: (p) => heading(p.heading) + cards(list(p.items), (item) =>
        `<h3>${esc(str(item.title))}</h3><p>${esc(str(item.body))}</p>`),
    menu: (p) => heading(p.heading) + `<div class="grid">${list(p.items).map((item) =>
        `<article class="menu-item"><h3>${esc(str(item.name))}</h3>`
        + `<p>${esc(str(item.description))}</p>`
        + `<p>${esc(str(item.price))}</p></article>`).join('')}</div>`,
    gallery: (p) => heading(p.heading) + `<div class="grid">${list(p.images).map((img) =>
        figure({ query: str(img.query), alt: str(img.alt) })).join('')}</div>`,
    team: (p) => heading(p.heading) + cards(list(p.members), (m) =>
        `<h3>${esc(str(m.name))}</h3><p class="kicker">${esc(str(m.role))}</p><p>${esc(str(m.bio))}</p>`,
        'person'),
    testimonials: (p) => heading(p.heading) + cards(list(p.items), (item) =>
        `<blockquote class="quote"><p>${esc(str(item.quote))}</p>`
        + `<footer>${esc(str(item.author))}</footer></blockquote>`,
        'quote'),
    faq: (p) => heading(p.heading) + list(p.items).map((item) =>
        `<details class="faq-item"><summary>${esc(str(item.question))}</summary>`
        + `<p>${esc(str(item.answer))}</p></details>`).join(''),
    contact: (p) => {
        const rows = ['blurb', 'address', 'phone', 'email', 'hours']
            .map((k) => p[k] ? `<p>${esc(str(p[k]))}</p>` : '')
            .join('');
        return heading(p.heading) + rows;
    },
    footer: (p) => `<p>${esc(str(p.tagline))}</p>`,
};

function heading(value: unknown, tag: 'h1' | 'h2' = 'h2'): string {
    const text = str(value);
    return text ? `<${tag}>${esc(text)}</${tag}>` : '';
}

function cards(
    items: Props[],
    inner: (item: Props) => string,
    cls = 'card',
): string {
    return `<div class="grid">${items.map((item) =>
        `<article class="${cls}">${inner(item)}</article>`).join('')}</div>`;
}

function figure(image: unknown): string {
    if (!image || typeof image !== 'object') return '';
    const rec = image as Props;
    const alt = str(rec.alt);
    const query = str(rec.query);
    if (!alt && !query) return '';
    return `<figure class="ph" aria-label="${escAttr(alt || query)}"><span>${esc(query || alt)}</span></figure>`;
}

function list(value: unknown): Props[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is Props => !!v && typeof v === 'object' && !Array.isArray(v));
}

function str(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function esc(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escAttr(value: string): string {
    return esc(value).replace(/'/g, '&#39;');
}
