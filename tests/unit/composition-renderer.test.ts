import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { CompositionView } from '@/lib/editor/composition-renderer';
import type { Composition } from '@/lib/contracts';

const composition: Composition = {
    schemaVersion: 3,
    vertical: 'consultant',
    artDirection: {
        themeId: 'clinical-blue',
        motionId: 'calm',
        radiusId: 'soft',
        spacingId: 'default',
        imageryId: 'bright-clean',
    },
    meta: { title: 'Test', description: 'Test', lang: 'en' },
    sections: [
        {
            id: 's1', type: 'hero', variant: 'centred', brief: '',
            visible: true, locked: false, source: 'ai',
            props: { heading: 'Hello clinic', sub: 'Welcome' },
        },
        {
            id: 's2', type: 'services', variant: 'cards', brief: '',
            visible: true, locked: false, source: 'ai',
            props: { heading: 'What we do', items: [{ title: 'Braces', body: 'Alignment' }] },
        },
        {
            id: 'hidden', type: 'about', variant: 'text', brief: '',
            visible: false, locked: false, source: 'ai',
            props: { heading: 'Secret', body: 'Should not render' },
        },
        {
            id: 's3', type: 'about', variant: 'text', brief: '',
            visible: true, locked: false, source: 'ai',
            props: { heading: 'About us', body: 'Family practice' },
        },
        {
            id: 's4', type: 'gallery', variant: 'grid', brief: '',
            visible: true, locked: false, source: 'ai',
            props: { heading: 'Photos', images: [{ query: 'clinic', alt: 'Waiting room' }] },
        },
        {
            id: 's5', type: 'contact', variant: 'simple', brief: '',
            visible: true, locked: false, source: 'ai',
            props: { heading: 'Visit', email: 'hi@x.in' },
        },
        {
            id: 's6', type: 'footer', variant: 'simple', brief: '',
            visible: true, locked: false, source: 'ai',
            props: { tagline: 'Smile Dental' },
        },
    ],
};

describe('composition renderer (D4)', () => {
    const html = renderToStaticMarkup(createElement(CompositionView, { composition }));

    it('renders visible sections as React markup', () => {
        expect(html).toContain('id="s1"');
        expect(html).toContain('data-type="hero"');
        expect(html).toContain('Hello clinic');
        expect(html).toContain('What we do');
        expect(html).toContain('Braces');
        expect(html).toContain('About us');
        expect(html).toContain('Waiting room');
        expect(html).toContain('hi@x.in');
        expect(html).toContain('Smile Dental');
    });

    it('skips hidden sections', () => {
        expect(html).not.toContain('Should not render');
        expect(html).not.toContain('id="hidden"');
    });
});
