import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { motionCss, motionJs } from '@/lib/render/motion-assets';

describe('motion assets stay inlined for the editor', () => {
    it('matches motion.css', () => {
        const disk = readFileSync('src/lib/render/motion.css', 'utf8');
        expect(motionCss.trim()).toBe(disk.trim());
    });

    it('matches motion.js', () => {
        const disk = readFileSync('src/lib/render/motion.js', 'utf8');
        expect(motionJs.trim()).toBe(disk.trim());
    });
});
