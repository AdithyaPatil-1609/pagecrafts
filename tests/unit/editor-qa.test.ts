import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { useEditorStore } from '@/lib/editor-store';
import type { Composition } from '@/lib/contracts';

function sample(): Composition {
    return {
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
                props: { heading: 'Hello' },
            },
            {
                id: 's2', type: 'services', variant: 'cards', brief: '',
                visible: true, locked: false, source: 'ai',
                props: { heading: 'Services' },
            },
        ],
    };
}

function jsonResponse(body: unknown) {
    return { json: async () => body } as Response;
}

beforeEach(() => {
    useEditorStore.getState().vfs.reset();
    useEditorStore.setState({
        projectId: null,
        composition: null,
        selectedSectionId: null,
        pendingChange: null,
        saving: false,
        saveError: null,
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('editor QA (D16–D20)', () => {
    it('loads composition.json when a project opens', async () => {
        const composition = sample();
        vi.stubGlobal('fetch', vi.fn(async () =>
            jsonResponse({
                ok: true,
                data: {
                    projectId: 'p1',
                    files: {
                        'index.html': '<h1>Hello</h1>',
                        'composition.json': JSON.stringify(composition),
                    },
                    updatedAt: 'now',
                    name: 'Clinic',
                },
            }),
        ));

        await useEditorStore.getState().loadProject('p1');

        expect(useEditorStore.getState().composition?.sections.map((s) => s.id)).toEqual(['s1', 's2']);
        expect(useEditorStore.getState().selectedSectionId).toBe('s1');
        expect(useEditorStore.getState().loadError).toBeNull();
    });

    it('reorders a section and regenerates the page without a provider call', () => {
        const composition = sample();
        const { vfs } = useEditorStore.getState();
        vfs.seed({
            'index.html': '<h1>Hello</h1>',
            'composition.json': JSON.stringify(composition),
        });
        useEditorStore.setState({ composition, selectedSectionId: 's1', projectId: 'p1' });

        useEditorStore.getState().moveSectionDown('s1');

        const next = useEditorStore.getState().composition;
        expect(next?.sections.map((s) => s.id)).toEqual(['s2', 's1']);
        expect(useEditorStore.getState().vfs.read('composition.json')).toContain('"id": "s2"');
    });

    it('keeps suggested-change copy in plain language', () => {
        const summary = readFileSync('src/components/editor/ChangeSummary.tsx', 'utf8');
        expect(summary).not.toMatch(/diff|patch|commit|hunk/i);
        expect(summary).toContain('Keep this change');
        expect(summary).toContain('Discard');
    });

    it('turns off motion for people who asked for less of it', () => {
        const css = readFileSync('src/app/globals.css', 'utf8');
        expect(css).toContain('prefers-reduced-motion');
        expect(css).toContain('skeleton-pulse');
    });

    it('offers a skip link into the preview', () => {
        const shell = readFileSync('src/components/editor/EditorShell.tsx', 'utf8');
        expect(shell).toContain('Skip to preview');
        expect(shell).toContain('#editor-preview');
        expect(shell).toContain('ChatPanel');
    });

    it('keeps the default editor as content plus your site', () => {
        const shell = readFileSync('src/components/editor/EditorShell.tsx', 'utf8');
        expect(shell).toContain('ContentPanel');
        expect(shell).toContain('askOpen || pendingChange');
        expect(shell).toContain('sectionsOpen && composition');
        const preview = readFileSync('src/components/editor/PreviewPane.tsx', 'utf8');
        expect(preview).toContain('Your site');
        expect(preview).toContain('Phone');
    });
});
