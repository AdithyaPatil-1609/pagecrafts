import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const auth = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({
    requireUser: auth.requireUser,
    supabaseRoute: async () => ({}),
}));

vi.mock('@/lib/limits/redis', async () => {
    const support = await import('../../support/redis-mock');
    return { redis: () => support.redisStub, isRedisConfigured: () => true };
});

const files = vi.hoisted(() => ({
    putProjectFile: vi.fn(async () => ({
        projectId: 'p_1', path: 'composition.json', dirty: true, updatedAt: 't',
    })),
}));
vi.mock('@/lib/data/project-files', () => files);

import { redisMock as limits, resetRedisMock } from '../../support/redis-mock';
import { setGateway, type Gateway } from '@/lib/ai/gateway';
import { POST as EDITS } from '@/app/api/v1/projects/[id]/edits/route';
import { POST as APPLY } from '@/app/api/v1/projects/[id]/edits/apply/route';
import { PATCH as COMPOSITION } from '@/app/api/v1/projects/[id]/composition/route';
import { setEditStore } from '@/lib/ai/edit/store';
import { SCHEMA_VERSION, type Composition, type SectionInstance } from '@/lib/contracts';

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

const heroProps = {
    eyebrow: 'Koramangala',
    heading: 'Old heading',
    sub: 'Same-week appointments.',
    ctaLabel: 'Book',
    image: { query: 'clinic', alt: 'Clinic' },
};

const hero: SectionInstance = {
    id: 's_01', type: 'hero', variant: 'centred', brief: 'welcome',
    visible: true, locked: false, source: 'ai', props: heroProps,
};

function composition(over: Partial<Composition> = {}): Composition {
    return {
        schemaVersion: SCHEMA_VERSION,
        vertical: 'dental-clinic',
        artDirection: {
            themeId: 'clinical-blue', motionId: 'calm', radiusId: 'soft',
            spacingId: 'default', imageryId: 'bright-clean',
        },
        meta: { title: 'Smile', description: 'Clinic', lang: 'en' },
        sections: [hero, {
            id: 's_02', type: 'services', variant: 'cards', brief: '',
            visible: true, locked: false, source: 'ai',
            props: { heading: 'Services', items: [{ title: 'Check-up', body: 'Care.' }] },
        }],
        ...over,
    };
}

const edits = (body: unknown) =>
    EDITS(
        new Request('http://x/e', {
            method: 'POST', body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' },
        }) as never,
        { params: Promise.resolve({ id: 'p_1' }) } as never,
    );

const apply = (body: unknown) =>
    APPLY(
        new Request('http://x/a', {
            method: 'POST', body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' },
        }) as never,
        { params: Promise.resolve({ id: 'p_1' }) } as never,
    );

const patch = (body: unknown) =>
    COMPOSITION(
        new Request('http://x/c', {
            method: 'PATCH', body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' },
        }) as never,
        { params: Promise.resolve({ id: 'p_1' }) } as never,
    );

beforeEach(() => {
    auth.requireUser.mockResolvedValue({ userId: 'u_1', supabase: {} });
    resetRedisMock();
    limits.evalMock.mockImplementation(async (_s: string, keys: string[]) =>
        keys[0]?.startsWith('cc:') ? 1 : [1, 19, 0]);
    setEditStore(null);
    files.putProjectFile.mockClear();
});

afterEach(() => {
    setGateway(null);
    vi.clearAllMocks();
});

describe('POST /edits/apply', () => {
    it('applies a stored proposal and writes composition.json', async () => {
        setGateway(fake(JSON.stringify({
            changes: { heading: 'Short heading' },
            explanation: 'Shortened.',
        })));

        const proposed = await (await edits({
            instruction: 'shorten the heading',
            section: { id: 's_01', type: 'hero', variant: 'centred', brief: 'welcome', props: heroProps },
        })).json();

        expect(proposed.data.edit_id).toMatch(/^edit_/);
        expect(proposed.data.applied).toBe(false);

        const res = await apply({
            edit_id: proposed.data.edit_id,
            composition: composition(),
        });
        const json = await res.json();

        expect(res.status).toBe(201);
        expect(json.data.applied).toBe(true);
        expect(json.data.composition.sections[0].props.heading).toBe('Short heading');
        expect(files.putProjectFile).toHaveBeenCalledOnce();
    });

    it('refuses to apply twice', async () => {
        setGateway(fake(JSON.stringify({
            changes: { heading: 'Short heading' },
            explanation: 'Shortened.',
        })));
        const proposed = await (await edits({
            instruction: 'x',
            section: { id: 's_01', type: 'hero', variant: 'centred', props: heroProps },
        })).json();

        const body = { edit_id: proposed.data.edit_id, composition: composition() };
        expect((await apply(body)).status).toBe(201);
        expect((await apply(body)).status).toBe(409);
    });
});

describe('PATCH /composition — zero provider calls (TC-129)', () => {
    it('never invokes the provider across reorder, hide, add, remove, variant and restyle', async () => {
        const complete = vi.fn();
        setGateway({ complete } as unknown as Gateway);

        const extra: SectionInstance = {
            id: 's_03', type: 'about', variant: 'text', brief: '',
            visible: true, locked: false, source: 'user',
            props: { heading: 'About', body: 'We treat families.', image: { query: 'clinic', alt: 'Clinic' } },
        };

        const ops = [
            [{ op: 'reorder', sectionId: 's_02', direction: 'up' }],
            [{ op: 'hide', sectionId: 's_01' }],
            [{ op: 'show', sectionId: 's_01' }],
            [{ op: 'variant', sectionId: 's_02', variant: 'grid' }],
            [{ op: 'restyle', artDirection: { motionId: 'kinetic' } }],
            [{ op: 'add', section: extra }],
            [{ op: 'remove', sectionId: 's_02' }],
        ];

        for (const batch of ops) {
            const res = await patch({ ops: batch, composition: composition() });
            expect(res.status, JSON.stringify(batch)).toBe(200);
        }

        expect(complete).not.toHaveBeenCalled();
    });

    it('the composition PATCH module does not import the gateway', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/app/api/v1/projects/[id]/composition/route.ts'),
            'utf8',
        );
        expect(src).not.toMatch(/from ['"]@\/lib\/ai\/gateway/);
    });
});
