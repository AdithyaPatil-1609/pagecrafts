import { describe, it, expect } from 'vitest';
import {
    validateComposition, motionSpanMs, motionsByCost, MOTION_BUDGET_MS,
} from '@/lib/ai/composition/validate';
import { motionTokens } from '@/lib/render/motion-tokens';
import {
    SCHEMA_VERSION, MOTION_IDS,
    type ArtDirection, type Composition, type MotionId, type SectionInstance, type SectionKey,
} from '@/lib/contracts';

const ART: ArtDirection = {
    themeId: 'clinical-blue', motionId: 'calm', radiusId: 'soft',
    spacingId: 'default', imageryId: 'bright-clean',
};

const section = (
    id: string, type: SectionKey, variant: string, visible = true,
): SectionInstance => ({
    id, type, variant, brief: 'b', visible, locked: false, source: 'ai', props: {},
});

function composition(sections: SectionInstance[], art: Partial<ArtDirection> = {}): Composition {
    return {
        schemaVersion: SCHEMA_VERSION,
        vertical: 'gym',
        artDirection: { ...ART, ...art },
        meta: { title: 'T', description: 'D', lang: 'en' },
        sections,
    };
}

/** A page of n middle sections with distinct variants, so only motion is under test. */
const page = (n: number, art: Partial<ArtDirection> = {}) => composition([
    section('s_00', 'hero', 'centred'),
    ...Array.from({ length: n }, (_, i) =>
        section(`s_${i + 1}`, 'services', `v${i}`)),
], art);

// ── motion tokens ──────────────────────────────────────────────────────────

describe('motion tokens — read from the stylesheet, not restated', () => {
    const tokens = motionTokens();

    it('has an entry for every registered motion id', () => {
        for (const id of MOTION_IDS) {
            expect(tokens[id], id).toBeDefined();
            expect(tokens[id].durationMs, id).toBeGreaterThan(0);
        }
    });

    it('reads the values motion.css actually declares', () => {
        expect(tokens.none).toMatchObject({ durationMs: 1, staggerMs: 0 });
        expect(tokens.whisper).toMatchObject({ durationMs: 500, staggerMs: 40 });
        expect(tokens.showcase).toMatchObject({ durationMs: 900, staggerMs: 100 });
    });

    it('inherits from :root where a block does not override', () => {
        // `calm` declares no ease of its own; distance/duration/stagger it does.
        expect(tokens.calm).toMatchObject({ distancePx: 12, durationMs: 700, staggerMs: 60 });
        // `kinetic` declares no distance override? it does — but blur-only blocks inherit.
        expect(tokens.editorial.durationMs).toBe(800);
    });

    it('falls back to :root for a block that overrides nothing relevant', () => {
        const css = ':root{--motion-distance:12px;--motion-duration:700ms;--motion-stagger:60ms;}'
            + '[data-motion="calm"]{--motion-ease:linear;}';
        expect(motionTokens(css).calm).toEqual({
            distancePx: 12, durationMs: 700, staggerMs: 60,
        });
    });
});

// ── the motion budget ──────────────────────────────────────────────────────

describe('motion budget — cost grows with section count, not just setting', () => {
    const tokens = motionTokens();

    it('spans stagger across sections plus one duration', () => {
        // 7 sections at showcase: 6 × 100ms stagger + 900ms = 1500ms.
        expect(motionSpanMs(tokens.showcase, 7)).toBe(1_500);
        expect(motionSpanMs(tokens.none, 7)).toBe(1);
        expect(motionSpanMs(tokens.showcase, 0)).toBe(0);
    });

    it('leaves a short page on the motion its art direction chose', () => {
        const result = validateComposition(page(3, { motionId: 'showcase' }));
        expect(result.composition.artDirection.motionId).toBe('showcase');
        expect(result.repaired).toBe(false);
    });

    it('steps a long page down until it fits', () => {
        // 14 animated sections at showcase: 13 × 100 + 900 = 2200ms, over budget.
        const long = page(13, { motionId: 'showcase' });
        const result = validateComposition(long);

        expect(result.repaired).toBe(true);
        expect(result.composition.artDirection.motionId).not.toBe('showcase');

        const after = result.composition.artDirection.motionId;
        expect(motionSpanMs(tokens[after], 14)).toBeLessThanOrEqual(MOTION_BUDGET_MS);
    });

    it('steps down rather than flattening to none — the art direction still means something', () => {
        const result = validateComposition(page(13, { motionId: 'showcase' }));
        expect(result.composition.artDirection.motionId).not.toBe('none');
    });

    it('names the before and after in the finding', () => {
        const result = validateComposition(page(13, { motionId: 'showcase' }));
        const finding = result.findings.find((f) => f.rule === 'motion-budget');

        expect(finding?.severity).toBe('repaired');
        expect(finding?.detail).toContain('showcase');
        expect(finding?.detail).toContain(String(MOTION_BUDGET_MS));
    });

    it('does not count a hidden section against the budget', () => {
        const sections = [
            section('s_00', 'hero', 'centred'),
            ...Array.from({ length: 13 }, (_, i) =>
                section(`s_${i + 1}`, 'services', `v${i}`, false)),
        ];
        const result = validateComposition(composition(sections, { motionId: 'showcase' }));
        expect(result.repaired).toBe(false);
    });

    it('never leaves a composition over budget', () => {
        for (const motionId of MOTION_IDS) {
            for (const n of [1, 5, 10, 20, 40]) {
                const out = validateComposition(page(n, { motionId }));
                const span = motionSpanMs(
                    tokens[out.composition.artDirection.motionId], n + 1,
                );
                expect(span, `${motionId} × ${n + 1}`).toBeLessThanOrEqual(MOTION_BUDGET_MS);
            }
        }
    });
});

// ── diversity within one page ──────────────────────────────────────────────

describe('diversity — the per-composition half of R-NEW-C', () => {
    it('flags a page whose middle sections are all one variant', () => {
        const monotone = composition([
            section('s_00', 'hero', 'centred'),
            section('s_01', 'services', 'cards'),
            section('s_02', 'team', 'cards'),
            section('s_03', 'testimonials', 'cards'),
        ]);

        const rules = validateComposition(monotone).findings.map((f) => f.rule);
        expect(rules).toContain('variant-monotony');
    });

    it('flags two adjacent sections sharing a variant', () => {
        const repeat = composition([
            section('s_00', 'hero', 'centred'),
            section('s_01', 'services', 'cards'),
            section('s_02', 'team', 'cards'),
            section('s_03', 'faq', 'accordion'),
        ]);

        expect(validateComposition(repeat).findings.some((f) => f.rule === 'variant-repeat'))
            .toBe(true);
    });

    it('says nothing about a varied page', () => {
        const varied = composition([
            section('s_00', 'hero', 'split-image'),
            section('s_01', 'services', 'cards'),
            section('s_02', 'gallery', 'masonry'),
            section('s_03', 'faq', 'accordion'),
            section('s_04', 'footer', 'simple'),
        ]);

        expect(validateComposition(varied).findings).toEqual([]);
    });

    it('does not complain about a two-section page, where repetition is not a pattern', () => {
        const small = composition([
            section('s_00', 'hero', 'centred'),
            section('s_01', 'contact', 'simple'),
        ]);
        expect(validateComposition(small).findings).toEqual([]);
    });

    it('notices art direction that contradicts itself', () => {
        const mismatched = page(2, { themeId: 'vivid-energy', motionId: 'none' });
        expect(validateComposition(mismatched).findings.some((f) => f.rule === 'motion-mismatch'))
            .toBe(true);
    });

    it('reports findings without rejecting the page', () => {
        const monotone = composition([
            section('s_00', 'hero', 'centred'),
            section('s_01', 'services', 'cards'),
            section('s_02', 'team', 'cards'),
            section('s_03', 'testimonials', 'cards'),
        ]);
        // A warn is a note for the eval, not a reason to fail a user's generation.
        const result = validateComposition(monotone);
        expect(result.composition.sections).toHaveLength(4);
        expect(result.repaired).toBe(false);
    });
});

describe('motion ranking — derived, because it is not fixed', () => {
    const tokens = motionTokens();

    it('ranks every registered motion id', () => {
        expect([...motionsByCost(7)].sort()).toEqual([...MOTION_IDS].sort());
    });

    it('orders by real cost at the given page length', () => {
        const spans = motionsByCost(7).map((m: MotionId) => motionSpanMs(tokens[m], 7));
        expect([...spans].sort((a, b) => a - b)).toEqual(spans);
    });

    /**
     * The reason the ladder is computed rather than written down. `kinetic` is
     * cheaper than `calm` on a short page because it is fast; on a long page its
     * wider stagger overtakes, and they swap. A hand-written "calmest first"
     * list is wrong at one end or the other.
     */
    it('genuinely reorders as the page grows', () => {
        const short = motionsByCost(5);
        const long = motionsByCost(30);
        expect(short).not.toEqual(long);

        expect(motionSpanMs(tokens.kinetic, 5)).toBeLessThan(motionSpanMs(tokens.calm, 5));
        expect(motionSpanMs(tokens.kinetic, 30)).toBeGreaterThan(motionSpanMs(tokens.calm, 30));
    });

    it('keeps the most expressive motion the page can afford', () => {
        // 13 middle + hero = 14 sections. showcase is 2200ms and must go; the
        // replacement should be the largest that still fits, not `none`.
        const out = validateComposition(page(13, { motionId: 'showcase' }));
        const chosen = out.composition.artDirection.motionId;
        const chosenSpan = motionSpanMs(tokens[chosen], 14);

        for (const id of MOTION_IDS) {
            const span = motionSpanMs(tokens[id], 14);
            if (span <= MOTION_BUDGET_MS) expect(chosenSpan).toBeGreaterThanOrEqual(span);
        }
    });
});
