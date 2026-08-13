import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SectionKey } from '@/lib/contracts';

const DIR = join(process.cwd(), 'src/lib/ai/harness/prompts/guidance');

const cache = new Map<string, string>();

/**
 * Per-section-type writing guidance, selected here and passed to the prompt as
 * a variable.
 *
 * A hero and an FAQ need different instructions, and one generic prompt serving
 * both is why copy reads generic. The harness has no conditionals, so the block
 * is chosen in code and kept on disk as text — tuning a section's voice stays a
 * text edit rather than a code change.
 *
 * A missing file is not an error: a section type with nothing particular to say
 * gets the general rules in the prompt body and nothing more.
 */
export function guidanceFor(type: SectionKey): string {
    const hit = cache.get(type);
    if (hit !== undefined) return hit;

    const path = join(DIR, `${type}.md`);
    const text = existsSync(path) ? readFileSync(path, 'utf8').trim() : '';

    cache.set(type, text);
    return text;
}

/** Test seam — the loader caches, and a test that writes a file needs it cleared. */
export function resetGuidanceCache(): void {
    cache.clear();
}
