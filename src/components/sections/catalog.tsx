import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type { Composition, SectionInstance, SectionKey } from '@/lib/contracts';
import { EDITOR_SECTION_TYPES } from '@/lib/editor/section-registry';

export interface SectionViewProps {
    section: SectionInstance;
    index: number;
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

function Frame({
    section,
    index,
    children,
}: {
    section: SectionInstance;
    index: number;
    children: ReactNode;
}) {
    const style = { ['--i' as string]: index } as CSSProperties;
    return (
        <section
            id={section.id}
            data-type={section.type}
            data-variant={section.variant}
            data-animate=""
            style={style}
        >
            {children}
        </section>
    );
}

function ImageSlot({ value, fallbackAlt }: { value: unknown; fallbackAlt: string }) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const rec = value as Record<string, unknown>;
        const query = asString(rec.query);
        const alt = asString(rec.alt) || fallbackAlt;
        return <div className="img-slot" role="img" aria-label={alt} data-query={query} />;
    }
    if (typeof value === 'string' && value) {
        return <div className="img-slot" role="img" aria-label={fallbackAlt} data-query={value} />;
    }
    return null;
}

export function HeroSection({ section, index }: SectionViewProps) {
    const p = section.props;
    const heading = asString(p.heading);
    return (
        <Frame section={section} index={index}>
            {asString(p.eyebrow) ? <p className="eyebrow">{asString(p.eyebrow)}</p> : null}
            {heading ? <h1>{heading}</h1> : null}
            {asString(p.sub) ? <p>{asString(p.sub)}</p> : null}
            {asString(p.ctaLabel) ? <a className="cta" href="#contact">{asString(p.ctaLabel)}</a> : null}
            <ImageSlot value={p.image} fallbackAlt={heading || 'Hero'} />
        </Frame>
    );
}

export function AboutSection({ section, index }: SectionViewProps) {
    const p = section.props;
    const heading = asString(p.heading);
    return (
        <Frame section={section} index={index}>
            {heading ? <h2>{heading}</h2> : null}
            {asString(p.body) ? <p>{asString(p.body)}</p> : null}
            <ImageSlot value={p.image} fallbackAlt={heading || 'About'} />
        </Frame>
    );
}

export function ServicesSection({ section, index }: SectionViewProps) {
    const p = section.props;
    return (
        <Frame section={section} index={index}>
            {asString(p.heading) ? <h2>{asString(p.heading)}</h2> : null}
            <ul>
                {asList(p.items).map((item, i) => (
                    <li key={i}>
                        <strong>{asString(item.title)}</strong>
                        {asString(item.body) ? <p>{asString(item.body)}</p> : null}
                    </li>
                ))}
            </ul>
        </Frame>
    );
}

export function MenuSection({ section, index }: SectionViewProps) {
    const p = section.props;
    return (
        <Frame section={section} index={index}>
            {asString(p.heading) ? <h2>{asString(p.heading)}</h2> : null}
            <ul>
                {asList(p.items).map((item, i) => (
                    <li key={i}>
                        <strong>{asString(item.name)}</strong>
                        {asString(item.price) ? <span className="price">{asString(item.price)}</span> : null}
                        {asString(item.description) ? <p>{asString(item.description)}</p> : null}
                    </li>
                ))}
            </ul>
        </Frame>
    );
}

export function GallerySection({ section, index }: SectionViewProps) {
    const p = section.props;
    return (
        <Frame section={section} index={index}>
            {asString(p.heading) ? <h2>{asString(p.heading)}</h2> : null}
            <div className="gallery">
                {asList(p.images).map((img, i) => {
                    const alt = asString(img.alt) || asString(img.query) || 'Gallery';
                    return (
                        <figure key={i}>
                            <ImageSlot value={img} fallbackAlt={alt} />
                            <figcaption>{alt}</figcaption>
                        </figure>
                    );
                })}
            </div>
        </Frame>
    );
}

export function TeamSection({ section, index }: SectionViewProps) {
    const p = section.props;
    return (
        <Frame section={section} index={index}>
            {asString(p.heading) ? <h2>{asString(p.heading)}</h2> : null}
            <ul>
                {asList(p.members).map((item, i) => (
                    <li key={i}>
                        <strong>{asString(item.name)}</strong>
                        {asString(item.role) ? <p className="role">{asString(item.role)}</p> : null}
                        {asString(item.bio) ? <p>{asString(item.bio)}</p> : null}
                    </li>
                ))}
            </ul>
        </Frame>
    );
}

export function TestimonialsSection({ section, index }: SectionViewProps) {
    const p = section.props;
    return (
        <Frame section={section} index={index}>
            {asString(p.heading) ? <h2>{asString(p.heading)}</h2> : null}
            {asList(p.items).map((item, i) => (
                <blockquote key={i}>
                    <p>{asString(item.quote)}</p>
                    {asString(item.author) ? <cite>{asString(item.author)}</cite> : null}
                </blockquote>
            ))}
        </Frame>
    );
}

export function FaqSection({ section, index }: SectionViewProps) {
    const p = section.props;
    return (
        <Frame section={section} index={index}>
            {asString(p.heading) ? <h2>{asString(p.heading)}</h2> : null}
            {asList(p.items).map((item, i) => (
                <details key={i}>
                    <summary>{asString(item.question)}</summary>
                    <p>{asString(item.answer)}</p>
                </details>
            ))}
        </Frame>
    );
}

export function ContactSection({ section, index }: SectionViewProps) {
    const p = section.props;
    return (
        <Frame section={section} index={index}>
            {asString(p.heading) ? <h2>{asString(p.heading)}</h2> : null}
            {asString(p.blurb) ? <p>{asString(p.blurb)}</p> : null}
            <address>
                {asString(p.address) ? <p>{asString(p.address)}</p> : null}
                {asString(p.phone) ? (
                    <p><a href={`tel:${asString(p.phone)}`}>{asString(p.phone)}</a></p>
                ) : null}
                {asString(p.email) ? (
                    <p><a href={`mailto:${asString(p.email)}`}>{asString(p.email)}</a></p>
                ) : null}
                {asString(p.hours) ? <p>{asString(p.hours)}</p> : null}
            </address>
        </Frame>
    );
}

export function FooterSection({ section, index }: SectionViewProps) {
    return (
        <Frame section={section} index={index}>
            <p>{asString(section.props.tagline)}</p>
        </Frame>
    );
}

export const SECTION_COMPONENTS: Record<SectionKey, ComponentType<SectionViewProps>> = {
    hero: HeroSection,
    about: AboutSection,
    services: ServicesSection,
    menu: MenuSection,
    gallery: GallerySection,
    team: TeamSection,
    testimonials: TestimonialsSection,
    faq: FaqSection,
    contact: ContactSection,
    footer: FooterSection,
};

export function CompositionView({ composition }: { composition: Composition }) {
    const visible = composition.sections.filter((section) => section.visible);
    return (
        <main>
            {visible.map((section, index) => {
                const Cmp = SECTION_COMPONENTS[section.type];
                return <Cmp key={section.id} section={section} index={index} />;
            })}
        </main>
    );
}

export function registeredComponent(type: SectionKey): ComponentType<SectionViewProps> {
    return SECTION_COMPONENTS[type];
}

export const REGISTERED_TYPES: readonly SectionKey[] = EDITOR_SECTION_TYPES;
