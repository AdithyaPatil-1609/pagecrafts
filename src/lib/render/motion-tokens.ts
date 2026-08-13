import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MOTION_IDS, type MotionId } from '@/lib/contracts';

export interface MotionToken {
    distancePx: number;
    durationMs: number;
    staggerMs: number;
}

/**
 * The motion numbers, read from `motion.css` rather than restated here.
 *
 * The stylesheet is what actually renders, so it is the only defensible source
 * for a budget computed against it. A hand-copied table would be correct on the
 * day it was written and silently wrong the first time someone tunes a
 * transition — the same drift that left the category enum seventeen buckets
 * behind its own type.
 */
const CSS_PATH = join(process.cwd(), 'src/lib/render/motion.css');

const ROOT_DEFAULTS: MotionToken = { distancePx: 12, durationMs: 700, staggerMs: 60 };

const NUMBER = (block: string, prop: string): number | undefined => {
    const found = new RegExp(`--motion-${prop}\\s*:\\s*(-?[\\d.]+)`).exec(block);
    return found ? Number(found[1]) : undefined;
};

function blockFor(css: string, selector: string): string {
    const at = css.indexOf(selector);
    if (at === -1) return '';
    const open = css.indexOf('{', at);
    const close = css.indexOf('}', open);
    return open === -1 || close === -1 ? '' : css.slice(open + 1, close);
}

let cache: Record<MotionId, MotionToken> | null = null;

export function motionTokens(cssText?: string): Record<MotionId, MotionToken> {
    if (!cssText && cache) return cache;

    const css = cssText ?? readFileSync(CSS_PATH, 'utf8');

    // `:root` supplies whatever a motion block does not override — the same
    // cascade the browser applies.
    const rootBlock = blockFor(css, ':root');
    const base: MotionToken = {
        distancePx: NUMBER(rootBlock, 'distance') ?? ROOT_DEFAULTS.distancePx,
        durationMs: NUMBER(rootBlock, 'duration') ?? ROOT_DEFAULTS.durationMs,
        staggerMs: NUMBER(rootBlock, 'stagger') ?? ROOT_DEFAULTS.staggerMs,
    };

    const tokens = Object.fromEntries(MOTION_IDS.map((id) => {
        const block = blockFor(css, `[data-motion="${id}"]`);
        return [id, {
            distancePx: NUMBER(block, 'distance') ?? base.distancePx,
            durationMs: NUMBER(block, 'duration') ?? base.durationMs,
            staggerMs: NUMBER(block, 'stagger') ?? base.staggerMs,
        } satisfies MotionToken];
    })) as Record<MotionId, MotionToken>;

    if (!cssText) cache = tokens;
    return tokens;
}

/** Test seam — the parse is cached, and a test that supplies its own CSS needs it cleared. */
export function resetMotionTokens(): void {
    cache = null;
}
