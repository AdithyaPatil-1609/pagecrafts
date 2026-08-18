import type { Composition, SectionInstance, SectionKey } from '@/lib/contracts';
import { SECTION_KEYS } from '@/lib/contracts';

const KNOWN = new Set<string>(SECTION_KEYS);

function esc(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const FALLBACK: Record<SectionKey, string> = {
    hero: 'Home',
    about: 'About',
    services: 'Services',
    menu: 'Menu',
    gallery: 'Gallery',
    team: 'Team',
    testimonials: 'Stories',
    faq: 'FAQ',
    contact: 'Contact',
    footer: 'Footer',
};

function navLabel(section: SectionInstance): string {
    if (section.type === 'hero') return 'Home';
    const heading = typeof section.props.heading === 'string' ? section.props.heading.trim() : '';
    return heading || FALLBACK[section.type];
}

export function navItems(composition: Composition): { id: string; label: string }[] {
    return composition.sections
        .filter((section) =>
            section.visible
            && section.type !== 'footer'
            && KNOWN.has(section.type),
        )
        .map((section) => ({ id: section.id, label: navLabel(section) }));
}

/** Header + in-page links for a generated one-page site. */
export function siteNavHtml(composition: Composition): string {
    const items = navItems(composition);
    if (items.length === 0) return '';

    const home = items[0];
    const brand = esc(composition.meta.title.trim() || 'Home');
    const links = items
        .map((item) => `<a href="#${esc(item.id)}">${esc(item.label)}</a>`)
        .join('');

    return `<header class="site-nav"><a class="wordmark" href="#${esc(home.id)}">${brand}</a><nav aria-label="Site">${links}</nav></header>`;
}

export const SITE_NAV_CSS = `
.site-nav {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 1rem; max-width: 72rem; margin: 0 auto; padding: 1rem 1.5rem;
}
.site-nav .wordmark { font-weight: 700; text-decoration: none; color: inherit; }
.site-nav nav { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; }
.site-nav nav a { color: var(--muted); text-decoration: none; font-size: 0.9rem; }
.site-nav nav a:hover, .site-nav nav a:focus { color: inherit; }
@media (max-width: 720px) {
  .site-nav { flex-direction: column; align-items: flex-start; }
}
`.replace(/\s+/g, ' ').trim();
