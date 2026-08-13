import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cachedProfile, setProfileStore, profileStore } from '@/lib/ai/profile-cache';
import * as profileModule from '@/lib/ai/profile';
import type { VerticalProfile } from '@/lib/contracts';

const PROFILE = (slug: string, aliases: string[] = []): VerticalProfile => ({
    slug,
    label: 'Dental clinic',
    aliases,
    recipe: [{ type: 'hero', required: true }, { type: 'contact', required: true }],
    artDirection: {
        themeId: 'clinical-blue', motionId: 'whisper', radiusId: 'soft',
        spacingId: 'default', imageryId: 'bright-clean',
    },
    vocabulary: { customer: 'patient', purchase: 'appointment' },
    imageQueries: ['clinic reception'],
});

let calls = 0;

function stubProfile(delayMs = 0, aliases: string[] = []) {
    return vi.spyOn(profileModule, 'profile').mockImplementation(async (vertical: string) => {
        calls += 1;
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        return {
            data: PROFILE(vertical, aliases),
            usage: {
                model: 'm', inputTokens: 900, outputTokens: 400,
                latencyMs: 50, promptVersion: 'profile.v1',
            },
        };
    });
}

beforeEach(() => {
    calls = 0;
    setProfileStore(null);
});

afterEach(() => vi.restoreAllMocks());

describe('profile cache — a repeat vertical costs zero requests', () => {
    it('pays a provider call the first time and nothing after', async () => {
        stubProfile();

        const first = await cachedProfile('dental-clinic');
        expect(first.cached).toBe(false);
        expect(first.usage.inputTokens).toBe(900);

        const second = await cachedProfile('dental-clinic');
        expect(second.cached).toBe(true);
        expect(second.usage.inputTokens).toBe(0);
        expect(second.data.label).toBe('Dental clinic');

        expect(calls).toBe(1);
    });

    it('normalises the slug before looking, so Dental Clinic is not a second row', async () => {
        stubProfile();

        await cachedProfile('dental-clinic');
        const again = await cachedProfile('  Dental Clinic  ');

        expect(again.cached).toBe(true);
        expect(calls).toBe(1);
    });

    it('counts uses, so the curation queue can be ranked', async () => {
        stubProfile();

        await cachedProfile('dental-clinic');
        await cachedProfile('dental-clinic');
        await cachedProfile('dental-clinic');

        const row = await profileStore().get('dental-clinic');
        expect(row?.usageCount).toBe(3);
    });
});

describe('profile cache — alias matching', () => {
    it('resolves dentist to dental-clinic without a second call', async () => {
        stubProfile(0, ['dentist', 'dental surgery']);

        await cachedProfile('dental-clinic');
        const viaAlias = await cachedProfile('dentist');

        expect(viaAlias.cached).toBe(true);
        expect(viaAlias.data.slug).toBe('dental-clinic');
        expect(calls).toBe(1);
    });

    it('normalises aliases the model wrote with spaces', async () => {
        stubProfile(0, ['dental surgery']);

        await cachedProfile('dental-clinic');
        expect((await cachedProfile('dental-surgery')).cached).toBe(true);
        expect(calls).toBe(1);
    });

    it('does not let a later profile steal an alias already claimed', async () => {
        stubProfile(0, ['clinic']);
        await cachedProfile('dental-clinic');

        vi.restoreAllMocks();
        stubProfile(0, ['clinic']);
        await cachedProfile('physiotherapy');

        const row = await profileStore().get('clinic');
        expect(row?.slug).toBe('dental-clinic');
    });
});

describe('profile cache — concurrent misses', () => {
    /**
     * The case that bites on launch day rather than in testing: ten users ask
     * for the same new vertical at once and each starts its own generation.
     */
    it('resolves ten concurrent misses for one slug with a single provider call', async () => {
        stubProfile(20);

        const results = await Promise.all(
            Array.from({ length: 10 }, () => cachedProfile('packers-movers')),
        );

        expect(calls).toBe(1);
        expect(results.every((r) => r.data.slug === 'packers-movers')).toBe(true);
        // Exactly one of them paid.
        expect(results.filter((r) => !r.cached).length).toBe(1);
    });

    it('still generates separately for two different slugs', async () => {
        stubProfile(10);

        await Promise.all([cachedProfile('yoga-studio'), cachedProfile('law-firm')]);
        expect(calls).toBe(2);
    });

    it('does not cache a failure — the next caller retries', async () => {
        const spy = vi.spyOn(profileModule, 'profile')
            .mockRejectedValueOnce(new Error('provider unreachable'));

        await expect(cachedProfile('vet-clinic')).rejects.toThrow('provider unreachable');

        spy.mockRestore();
        stubProfile();

        const retry = await cachedProfile('vet-clinic');
        expect(retry.cached).toBe(false);
        expect(retry.data.slug).toBe('vet-clinic');
    });
});

describe('profile cache — status', () => {
    it('inserts as ai_generated and never promotes itself', async () => {
        stubProfile();

        await cachedProfile('driving-school');
        for (let i = 0; i < 50; i += 1) await cachedProfile('driving-school');

        const row = await profileStore().get('driving-school');
        expect(row?.status).toBe('ai_generated');
        expect(row?.usageCount).toBe(51);
    });

    it('regenerates a rejected profile rather than serving it', async () => {
        stubProfile();
        await cachedProfile('tuition-centre');

        const row = await profileStore().get('tuition-centre');
        if (row) row.status = 'rejected';

        const next = await cachedProfile('tuition-centre');
        expect(next.cached).toBe(false);
        expect(calls).toBe(2);
    });
});
