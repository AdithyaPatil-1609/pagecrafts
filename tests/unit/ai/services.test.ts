import { describe, it, expect, afterEach, vi } from 'vitest';
import { setGateway, type Gateway } from '@/lib/ai/gateway';
import { classify } from '@/lib/ai/classify';
import { plan } from '@/lib/ai/generate/plan';
import { fillSection } from '@/lib/ai/generate/fill';
import { proposeEdit } from '@/lib/ai/edit/propose';
import type { IntentAttributes, SectionInstance, VerticalProfile } from '@/lib/contracts';

function fake(reply: string | Error): Gateway {
    return {
        async complete() {
            if (reply instanceof Error) throw reply;
            return {
                provider: 'gemini',
                text: reply,
                model: 'fake',
                inputTokens: 10,
                outputTokens: 20,
                latencyMs: 5,
            };
        },
    };
}

const intent: IntentAttributes = {
    category: 'other',
    vertical: 'dental-clinic',
    tone: 'formal',
    palette: 'light',
    sections: ['hero'],
    fallback: false,
};

const profile: VerticalProfile = {
    slug: 'dental-clinic',
    label: 'Dental clinic',
    aliases: [],
    recipe: [{ type: 'hero', required: true }],
    artDirection: {
        themeId: 'clinical-blue', motionId: 'whisper',
        radiusId: 'soft', spacingId: 'default', imageryId: 'bright-clean',
    },
    vocabulary: { customer: 'patient', purchase: 'appointment' },
    imageQueries: ['dental clinic'],
};

const section: SectionInstance = {
    id: 's_01', type: 'hero', variant: 'centred', brief: 'welcome',
    visible: true, locked: false, source: 'ai',
    props: { heading: 'A Very Long Heading Indeed' },
};

const fillContext = {
    vertical: 'dental-clinic',
    tone: 'formal',
    prompt: 'a dental clinic in koramangala',
    customerWord: 'patient',
};

afterEach(() => setGateway(null));

describe('classify (M3.2)', () => {
    it('returns a clean result and marks fallback false', async () => {
        setGateway(fake(JSON.stringify({
            category: 'portfolio', vertical: 'photography',
            tone: 'minimal', palette: 'dark', sections: ['hero'],
        })));
        const { data } = await classify('a dark site for a photography studio');
        expect(data.vertical).toBe('photography');
        expect(data.fallback).toBe(false);
    });

    it('degrades to other when the provider errors (FR-024, TC-024)', async () => {
        setGateway(fake(new Error('502 upstream')));
        const { data } = await classify('anything at all');
        expect(data.category).toBe('other');
        expect(data.vertical).toBe('general-business');
        expect(data.fallback).toBe(true);
    });

    it('degrades when the reply is not JSON', async () => {
        setGateway(fake('sorry, I cannot help with that'));
        const { data } = await classify('anything');
        expect(data.fallback).toBe(true);
    });

    it('degrades when the reply is JSON of the wrong shape', async () => {
        setGateway(fake(JSON.stringify({ nonsense: true })));
        const { data } = await classify('anything');
        expect(data.fallback).toBe(true);
    });

    it('marks fallback true when the category had to be coerced', async () => {
        setGateway(fake(JSON.stringify({
            category: 'bakery', vertical: 'photography',
            tone: 'minimal', palette: 'dark', sections: ['hero'],
        })));
        const { data } = await classify('a bakery site');
        expect(data.category).toBe('other');
        expect(data.fallback).toBe(true);
    });

    it('keeps fallback false when only the tone was coerced', async () => {
        setGateway(fake(JSON.stringify({
            category: 'portfolio', vertical: 'photography',
            tone: 'moody', palette: 'dark', sections: ['hero'],
        })));
        const { data } = await classify('a photography site');
        expect(data.tone).toBe('minimal');
        expect(data.fallback).toBe(false);
    });

    it('never calls the provider for empty input', async () => {
        const complete = vi.fn();
        setGateway({ complete } as unknown as Gateway);
        const { data } = await classify('   ');
        expect(complete).not.toHaveBeenCalled();
        expect(data.fallback).toBe(true);
    });

    it('truncates input to 500 characters (FR-021)', async () => {
        let sent = '';
        setGateway({
            async complete(req) {
                sent = req.user;
                return {
                    provider: 'gemini',
                    text: JSON.stringify({
                        category: 'other', vertical: 'general-business',
                        tone: 'minimal', palette: 'light', sections: [],
                    }),
                    model: 'fake', inputTokens: 1, outputTokens: 1, latencyMs: 1,
                };
            },
        });
        await classify('x'.repeat(900));
        expect(sent).not.toContain('x'.repeat(501));
    });
});

describe('plan (M3.3 stage one)', () => {
    it('assigns stable ids, hero first, footer last', async () => {
        setGateway(fake(JSON.stringify({
            sections: [
                { type: 'services', variant: 'cards', brief: 'what we treat' },
                { type: 'hero', variant: 'centred', brief: 'welcome' },
                { type: 'footer', variant: 'simple', brief: 'end' },
            ],
        })));
        const { data } = await plan('a dental clinic', intent, profile);

        expect(data[0].type).toBe('hero');
        expect(data[0].id).toBe('s_01');
        expect(data[1].id).toBe('s_02');
        expect(data.at(-1)?.type).toBe('footer');
        expect(data.every((s) => s.source === 'ai')).toBe(true);
        expect(data.every((s) => Object.keys(s.props).length === 0)).toBe(true);
    });

    it('repairs an invented variant to a registered one', async () => {
        setGateway(fake(JSON.stringify({
            sections: [{ type: 'hero', variant: 'spectacular', brief: 'x' }],
        })));
        const { data } = await plan('x', intent, profile);
        expect(data[0].type).toBe('hero');
        expect(data[0].variant).toBe('centred');
    });

    it('throws when the reply is not JSON', async () => {
        setGateway(fake('not json'));
        await expect(plan('x', intent, profile)).rejects.toThrow();
    });

    it('records the prompt version that produced the output', async () => {
        setGateway(fake(JSON.stringify({
            sections: [{ type: 'hero', variant: 'centred', brief: 'x' }],
        })));
        const { usage } = await plan('x', intent, profile);
        expect(usage.promptVersion).toBe('plan.v1');
    });

    // A dispatched-but-failed call still cost tokens; usage rides on the error.
    it('attaches usage to a validation failure', async () => {
        setGateway(fake(JSON.stringify({ sections: [] })));
        await expect(plan('x', intent, profile)).rejects.toMatchObject({
            detail: expect.objectContaining({
                usage: expect.objectContaining({ provider: 'gemini' }),
            }),
        });
    });
});

describe('fillSection (M3.3 stage two)', () => {
    it('returns validated fields and no markup', async () => {
        setGateway(fake(JSON.stringify({
            eyebrow: 'Koramangala',
            heading: 'Gentle dentistry',
            sub: 'Same-week appointments.',
            ctaLabel: 'Book',
            image: { query: 'dental clinic', alt: 'Clinic' },
        })));
        const { data } = await fillSection(section, fillContext);
        expect(data.heading).toBe('Gentle dentistry');
        expect(JSON.stringify(data)).not.toContain('<');
    });

    it('strips a script and an onerror handler (AC-F4-5)', async () => {
        setGateway(fake(JSON.stringify({
            eyebrow: 'a',
            heading: 'Hi',
            sub: 'Same-week appointments.<script>alert(1)</script><img onerror="steal()">',
            ctaLabel: 'Book',
            image: { query: 'q', alt: 'a' },
        })));
        const { data } = await fillSection(section, fillContext);
        expect(data.sub).not.toContain('script');
        expect(data.sub).not.toContain('onerror');
        expect(data.sub).toContain('Same-week appointments.');
    });

    it('fails validation when a field is empty after sanitising', async () => {
        setGateway(fake(JSON.stringify({
            eyebrow: 'a',
            heading: 'Hi',
            sub: '<script>alert(1)</script>',
            ctaLabel: 'Book',
            image: { query: 'q', alt: 'a' },
        })));
        await expect(fillSection(section, fillContext)).rejects.toThrow();
    });

    it('throws when a required field is missing', async () => {
        setGateway(fake(JSON.stringify({ heading: 'Hi' })));
        await expect(fillSection(section, fillContext)).rejects.toThrow(/hero/);
    });
});

describe('proposeEdit (M3.5)', () => {
    it('returns a patch and never claims to have applied it (FR-062)', async () => {
        setGateway(fake(JSON.stringify({
            changes: { heading: 'Short heading' },
            explanation: 'Shortened the heading.',
        })));
        const { data } = await proposeEdit(section, 'make the heading shorter');

        expect(data.applied).toBe(false);
        expect(data.targetSectionId).toBe('s_01');
        expect(data.patch).toEqual([
            { op: 'replace', path: '/props/heading', value: 'Short heading' },
        ]);
        expect(data.explanation).toBe('Shortened the heading.');
    });

    it('uses add for a field that does not exist yet', async () => {
        setGateway(fake(JSON.stringify({
            changes: { eyebrow: 'Koramangala' },
            explanation: 'Added a location line.',
        })));
        const { data } = await proposeEdit(section, 'mention the area');
        expect(data.patch[0].op).toBe('add');
    });

    it('sanitises the proposal before it is rendered (FR-066)', async () => {
        setGateway(fake(JSON.stringify({
            changes: { heading: 'Hi<script>steal()</script>' },
            explanation: 'Changed the heading.',
        })));
        const { data } = await proposeEdit(section, 'change the heading');
        expect(JSON.stringify(data.patch)).not.toContain('script');
    });

    it('leaves the original section untouched', async () => {
        const before = JSON.stringify(section);
        setGateway(fake(JSON.stringify({
            changes: { heading: 'New' }, explanation: 'x',
        })));
        await proposeEdit(section, 'change it');
        expect(JSON.stringify(section)).toBe(before);
    });
});