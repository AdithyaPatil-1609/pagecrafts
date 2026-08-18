import type { Composition, FileMap, SectionInstance, SectionKey } from '@/lib/contracts';
import { compositionShell } from '@/lib/render/page-shell';
import { SITE_NAV_CSS, siteNavHtml } from '@/lib/render/site-chrome';

/**
 * Turn a generated composition into a one-page site.
 *
 * This is not a gallery template: the words, sections and art direction come
 * from the job. Markup is HTML + CSS so the editor preview and publish path
 * already know how to show it. Image queries stay as slots — choosing a
 * photograph is a content edit, not something this renderer invents.
 */

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function asList(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> =>
            !!item && typeof item === 'object' && !Array.isArray(item))
        : [];
}

function imageSlot(value: unknown, fallbackAlt: string): string {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const rec = value as Record<string, unknown>;
        const query = asString(rec.query);
        const alt = asString(rec.alt) || fallbackAlt;
        return `<figure class="photo" role="img" aria-label="${escapeHtml(alt)}" data-query="${escapeHtml(query)}"><span>${escapeHtml(alt || query)}</span></figure>`;
    }
    if (typeof value === 'string' && value) {
        return `<figure class="photo" role="img" aria-label="${escapeHtml(fallbackAlt)}" data-query="${escapeHtml(value)}"><span>${escapeHtml(fallbackAlt)}</span></figure>`;
    }
    return '';
}

function heading(value: unknown, tag: 'h1' | 'h2' = 'h2'): string {
    const text = asString(value);
    return text ? `<${tag}>${escapeHtml(text)}</${tag}>` : '';
}

function cards(
    items: Record<string, unknown>[],
    inner: (item: Record<string, unknown>) => string,
    cls = 'card',
): string {
    if (items.length === 0) return '';
    return `<div class="grid">${items.map((item) =>
        `<article class="${cls}">${inner(item)}</article>`).join('')}</div>`;
}

function renderSection(section: SectionInstance, index: number, contactId: string | null): string {
    const p = section.props;
    const headingText = asString(p.heading);
    const open = `<section id="${escapeHtml(section.id)}" class="${escapeHtml(section.type)} ${escapeHtml(section.variant)}" data-type="${escapeHtml(section.type)}" data-variant="${escapeHtml(section.variant)}" data-animate style="--i:${index}">`;
    const inner = renderInner(section.type, p, headingText, contactId);
    return `${open}${inner}</section>`;
}

function renderInner(
    type: SectionKey,
    p: Record<string, unknown>,
    headingText: string,
    contactId: string | null,
): string {
    switch (type) {
        case 'hero': {
            const copy = [
                asString(p.eyebrow) ? `<p class="eyebrow">${escapeHtml(asString(p.eyebrow))}</p>` : '',
                heading(p.heading, 'h1'),
                asString(p.sub) ? `<p class="lede">${escapeHtml(asString(p.sub))}</p>` : '',
                asString(p.ctaLabel)
                    ? `<a class="cta" href="#${escapeHtml(contactId ?? 'contact')}">${escapeHtml(asString(p.ctaLabel))}</a>`
                    : '',
            ].join('');
            const pic = imageSlot(p.image, asString(p.heading) || 'Hero');
            return `<div class="hero-copy">${copy}</div>${pic}`;
        }
        case 'about': {
            const copy = heading(headingText) + (asString(p.body) ? `<p>${escapeHtml(asString(p.body))}</p>` : '');
            return `<div class="split">${copy}${imageSlot(p.image, headingText || 'About')}</div>`;
        }
        case 'services':
            return heading(headingText) + cards(asList(p.items), (item) =>
                `<h3>${escapeHtml(asString(item.title))}</h3><p>${escapeHtml(asString(item.body))}</p>`);
        case 'menu':
            return heading(headingText) + cards(asList(p.items), (item) =>
                `<h3>${escapeHtml(asString(item.name) || asString(item.title))}</h3>`
                + `<p>${escapeHtml(asString(item.description) || asString(item.body))}</p>`
                + (asString(item.price) ? `<p class="price">${escapeHtml(asString(item.price))}</p>` : ''),
                'card menu-item');
        case 'gallery': {
            const images = asList(p.images);
            const figures = images.map((img) =>
                imageSlot(img, asString(img.alt) || asString(img.query) || 'Gallery')).join('');
            return `${heading(headingText)}<div class="gallery">${figures}</div>`;
        }
        case 'team':
            return heading(headingText) + cards(asList(p.members), (item) =>
                `<h3>${escapeHtml(asString(item.name))}</h3>`
                + (asString(item.role) ? `<p class="eyebrow">${escapeHtml(asString(item.role))}</p>` : '')
                + `<p>${escapeHtml(asString(item.bio))}</p>`,
                'card person');
        case 'testimonials':
            return heading(headingText) + cards(asList(p.items), (item) =>
                `<blockquote><p>${escapeHtml(asString(item.quote))}</p>`
                + (asString(item.author) ? `<cite>${escapeHtml(asString(item.author))}</cite>` : '')
                + `</blockquote>`,
                'card quote');
        case 'faq':
            return heading(headingText) + asList(p.items).map((item) =>
                `<details class="faq-item"><summary>${escapeHtml(asString(item.question))}</summary>`
                + `<p>${escapeHtml(asString(item.answer))}</p></details>`).join('');
        case 'contact': {
            const send = asString(p.ctaLabel) || 'Send';
            return [
                heading(headingText),
                asString(p.blurb) ? `<p>${escapeHtml(asString(p.blurb))}</p>` : '',
                '<div class="contact-grid">',
                '<address>',
                asString(p.address) ? `<p>${escapeHtml(asString(p.address))}</p>` : '',
                asString(p.phone) ? `<p><a href="tel:${escapeHtml(asString(p.phone))}">${escapeHtml(asString(p.phone))}</a></p>` : '',
                asString(p.email) ? `<p><a href="mailto:${escapeHtml(asString(p.email))}">${escapeHtml(asString(p.email))}</a></p>` : '',
                asString(p.hours) ? `<p>${escapeHtml(asString(p.hours))}</p>` : '',
                '</address>',
                `<form class="form" action="" method="post">
        <input type="text" name="name" placeholder="Your name" aria-label="Name" autocomplete="name" />
        <input type="email" name="email" placeholder="you@example.com" aria-label="Email" autocomplete="email" required />
        <textarea name="message" rows="4" placeholder="How can we help?" aria-label="Message"></textarea>
        <button type="submit">${escapeHtml(send)}</button>
      </form>`,
                '</div>',
            ].join('');
        }
        case 'footer':
            return `<p>${escapeHtml(asString(p.tagline))}</p>`;
        default: {
            const exhaustive: never = type;
            return exhaustive;
        }
    }
}

const PAGE_CSS = `
${SITE_NAV_CSS}
.site-nav { position: sticky; top: 0; z-index: 2; background: var(--bg); border-bottom: var(--border-width) solid var(--rule); }
main { max-width: 72rem; margin: 0 auto; padding-inline: 1.5rem; padding-bottom: 3rem; }
section { padding-block: var(--section-gap); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--muted); margin: 0 0 0.5rem; }
.lede { font-size: 1.05rem; color: var(--muted); }
[data-type="hero"] {
  display: grid; gap: var(--stack-gap); align-items: center;
}
[data-variant="split-image"], [data-variant="media-split"], .split {
  display: grid; gap: var(--stack-gap); align-items: center;
}
@media (min-width: 720px) {
  [data-variant="split-image"], [data-variant="media-split"], .split {
    grid-template-columns: 1.05fr 0.95fr;
  }
}
.cta {
  display: inline-block; margin-top: 1.25rem; padding: 0.75rem 1.4rem;
  background: var(--accent); color: var(--accent-ink);
  border-radius: var(--radius-md); text-decoration: none; font-weight: 600;
  cursor: pointer;
}
.cta:hover, .cta:focus { filter: brightness(1.08); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: var(--stack-gap); margin-top: 1.5rem; }
.card, .faq-item {
  background: var(--panel); border: var(--border-width) solid var(--rule);
  border-radius: var(--radius-md); padding: 1.25rem;
}
.card h3 { margin: 0 0 0.4rem; font-size: 1.05rem; }
.photo {
  display: grid; place-items: center; min-height: 14rem; margin: 0;
  background: var(--panel); color: var(--muted); border-radius: var(--radius-md);
  border: var(--border-width) solid var(--rule); font-size: 0.85rem; text-align: center; padding: 1rem;
}
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: var(--stack-gap); }
.price { color: var(--muted); margin: 0.4rem 0 0; }
blockquote { margin: 0; }
cite { display: block; color: var(--muted); font-style: normal; margin-top: 0.4rem; }
.faq-item { margin-top: 0.6rem; }
.faq-item summary { cursor: pointer; font-weight: 600; }
.contact-grid { display: grid; gap: var(--stack-gap); margin-top: 1.5rem; }
@media (min-width: 720px) { .contact-grid { grid-template-columns: 1fr 1fr; } }
address { font-style: normal; }
.form { display: grid; gap: 0.75rem; }
.form input, .form textarea {
  width: 100%; padding: 0.75rem 1rem; border: var(--border-width) solid var(--rule);
  border-radius: var(--radius-md); background: var(--panel); color: var(--ink); font: inherit;
}
.form button {
  justify-self: start; padding: 0.75rem 1.4rem; border: 0; border-radius: var(--radius-md);
  background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 600; cursor: pointer;
}
[data-type="footer"] { color: var(--muted); font-size: 0.9rem; border-top: var(--border-width) solid var(--rule); }
`;

/** A generated site as the file tree persistence already stores. */
export function compositionToFiles(composition: Composition): FileMap {
    const visible = composition.sections.filter((s) => s.visible);
    const contactId = visible.find((s) => s.type === 'contact')?.id ?? null;
    const nav = siteNavHtml(composition);
    const body = `<style>${PAGE_CSS}</style>\n${nav}\n<main>\n${visible.map((section, index) => renderSection(section, index, contactId)).join('\n')}\n</main>`;

    return {
        'index.html': compositionShell({
            title: composition.meta.title,
            description: composition.meta.description,
            lang: composition.meta.lang,
            artDirection: composition.artDirection,
            body,
        }),
    };
}
