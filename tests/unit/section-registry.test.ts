import { describe, expect, it } from 'vitest';
import { EDITOR_SECTION_TYPES, hasVariant, isSectionKey, sectionLabel } from '@/lib/editor/section-registry';
import { SECTION_COMPONENTS } from '@/components/sections/catalog';

describe('section registry (D3/D4)', () => {
    it('registers every section type, starting with hero and services', () => {
        expect(EDITOR_SECTION_TYPES[0]).toBe('hero');
        expect(EDITOR_SECTION_TYPES).toContain('services');
        expect(EDITOR_SECTION_TYPES).toHaveLength(10);
        expect(Object.keys(SECTION_COMPONENTS).sort()).toEqual([...EDITOR_SECTION_TYPES].sort());
    });

    it('labels types in plain language', () => {
        expect(sectionLabel('hero')).toBe('Hero');
        expect(sectionLabel('services')).toBe('Services');
    });

    it('accepts centred and centered for the hero', () => {
        expect(isSectionKey('hero')).toBe(true);
        expect(isSectionKey('not-a-section')).toBe(false);
        expect(hasVariant('hero', 'centred')).toBe(true);
        expect(hasVariant('hero', 'centered')).toBe(true);
        expect(hasVariant('hero', 'unknown')).toBe(false);
    });
});
