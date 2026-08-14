import { describe, expect, it } from 'vitest';
import { compositionThumbnail, DESKTOP } from '@/lib/ai/catalogue/thumbnails';
import { compositionToHtml } from '@/lib/render/composition-html';
import { SCHEMA_VERSION, type Composition, type SectionKey } from '@/lib/contracts';

const sample: Composition = {
    schemaVersion: SCHEMA_VERSION,
    vertical: 'dental-clinic',
    artDirection: {
        themeId: 'clinical-blue', motionId: 'calm', radiusId: 'soft',
        spacingId: 'default', imageryId: 'bright-clean',
    },
    meta: { title: 'Smile', description: '', lang: 'en' },
    sections: [{
        id: 's_01', type: 'hero', variant: 'centred', brief: '',
        visible: true, locked: false, source: 'ai', props: {},
    }],
};

describe('catalogue thumbnails (TC-126)', () => {
    it('a re-run of the SVG stand-in is byte-identical', () => {
        expect(compositionThumbnail(sample, DESKTOP))
            .toBe(compositionThumbnail(sample, DESKTOP));
    });

    it('composition HTML is byte-identical across renders (AC-F4-10)', () => {
        expect(compositionToHtml(sample)).toBe(compositionToHtml(sample));
    });

    it('omits unknown section types on the publish path (TC-125)', () => {
        const html = compositionToHtml({
            ...sample,
            sections: [
                sample.sections[0],
                {
                    id: 's_99', type: 'not-a-section' as SectionKey, variant: 'x',
                    brief: '', visible: true, locked: false, source: 'ai',
                    props: { heading: 'should not appear' },
                },
            ],
        });
        expect(html).toContain('data-section="hero"');
        expect(html).not.toContain('not-a-section');
        expect(html).not.toContain('should not appear');
    });

    it('escapes copy so a heading cannot break out of the markup', () => {
        const html = compositionToHtml({
            ...sample,
            meta: { title: 'Smile <script>', description: '', lang: 'en' },
            sections: [{
                ...sample.sections[0],
                props: { heading: 'We <b>care</b>', ctaLabel: 'Book "now"' },
            }],
        });
        expect(html).toContain('We &lt;b&gt;care&lt;/b&gt;');
        expect(html).toContain('Book &quot;now&quot;');
        expect(html).toContain('<title>Smile &lt;script&gt;</title>');
        expect(html).not.toContain('<title>Smile <script>');
    });
});
