import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setGateway, type Gateway } from '@/lib/ai/gateway';
import { proposeEdit } from '@/lib/ai/edit/propose';
import type { SectionInstance } from '@/lib/contracts';

function fake(reply: string): Gateway {
    return {
        async complete() {
            return {
                provider: 'groq' as const, text: reply, model: 'm',
                inputTokens: 1, outputTokens: 1, latencyMs: 1,
            };
        },
    };
}

const section: SectionInstance = {
    id: 's_01', type: 'hero', variant: 'centred', brief: 'welcome',
    visible: true, locked: false, source: 'ai',
    props: { heading: 'Old heading' },
};

afterEach(() => setGateway(null));

describe('scoped edits (M3.5)', () => {
    it('returns a patch and never applies it', async () => {
        setGateway(fake(JSON.stringify({
            changes: { heading: 'New heading' },
            explanation: 'Made the heading punchier.',
        })));

        const { data } = await proposeEdit(section, 'make the heading punchier');
        expect(data.applied).toBe(false);
        expect(data.targetSectionId).toBe('s_01');
        expect(data.patch).toEqual([
            { op: 'replace', path: '/props/heading', value: 'New heading' },
        ]);
    });

    it('marks a new field as add rather than replace', async () => {
        setGateway(fake(JSON.stringify({
            changes: { sub: 'A subheading' },
            explanation: 'Added a subheading.',
        })));
        const { data } = await proposeEdit(section, 'add a subheading');
        expect(data.patch[0].op).toBe('add');
    });

    // FR-067 — one instruction, exactly one target.
    it('targets only the section it was given', async () => {
        setGateway(fake(JSON.stringify({
            changes: { heading: 'x' }, explanation: 'y',
        })));
        const { data } = await proposeEdit(section, 'change it');
        expect(new Set(data.patch.map((p) => p.path.split('/')[1]))).toEqual(new Set(['props']));
        expect(data.targetSectionId).toBe(section.id);
    });

    // FR-066 — a rejected proposal is still rendered to a human, so both the
    // changes and the explanation must be clean before they are returned.
    it('sanitises the changes', async () => {
        setGateway(fake(JSON.stringify({
            changes: { heading: 'Hi<script>alert(1)</script>' },
            explanation: 'ok',
        })));
        const { data } = await proposeEdit(section, 'x');
        expect(JSON.stringify(data.patch)).not.toContain('<script');
    });

    it('sanitises the explanation, which is shown even when rejected', async () => {
        setGateway(fake(JSON.stringify({
            changes: { heading: 'clean' },
            explanation: 'Done <script>steal()</script> now',
        })));
        const { data } = await proposeEdit(section, 'x');
        expect(data.explanation).not.toContain('<script');
        expect(data.explanation).toContain('Done');
    });

    it('rejects a malformed proposal rather than half-applying it', async () => {
        setGateway(fake(JSON.stringify({ explanation: 'no changes key' })));
        await expect(proposeEdit(section, 'x')).rejects.toThrow(/proposeEdit/);
    });

    // C-03 — the write path is absent, not disabled. A static check, because a
    // guarded write is exactly what this rule forbids.
    it('the edit module reaches no filesystem write API', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/lib/ai/edit/propose.ts'), 'utf8');
        for (const banned of ['writeFile', 'writeFileSync', 'appendFile', 'rm(', 'unlink', 'node:fs']) {
            expect(src).not.toContain(banned);
        }
    });
});
