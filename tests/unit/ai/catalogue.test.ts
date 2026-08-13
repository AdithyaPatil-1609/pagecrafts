import { describe, expect, it } from 'vitest';
import { compositionThumbnail, DESKTOP } from '@/lib/ai/catalogue/thumbnails';
import { SCHEMA_VERSION, type Composition } from '@/lib/contracts';

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
    it('a re-run is byte-identical', () => {
        expect(compositionThumbnail(sample, DESKTOP))
            .toBe(compositionThumbnail(sample, DESKTOP));
    });
});
