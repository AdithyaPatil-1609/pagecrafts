import type { SupabaseClient } from '@supabase/supabase-js';
import type { VerticalProfile } from '@/lib/contracts';
import type { CachedProfile, ProfileStore } from '../profile-cache';

function asProfile(value: unknown, slug: string): VerticalProfile | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const p = value as VerticalProfile;
    if (!p.label || !p.recipe || !p.artDirection) return undefined;
    return { ...p, slug: p.slug || slug };
}

/**
 * Durable profile cache against `vertical_profiles` (M3.9).
 *
 * Reads can use the user-scoped client (RLS allows select). Writes go through
 * whatever client is passed — production uses the service role.
 */
export class SupabaseProfileStore implements ProfileStore {
    constructor(private readonly supabase: SupabaseClient) {}

    async get(slug: string): Promise<CachedProfile | undefined> {
        const direct = await this.supabase
            .from('vertical_profiles')
            .select('slug, profile, status, usage_count, prompt_version')
            .eq('slug', slug)
            .maybeSingle();

        if (direct.data) return this.row(direct.data);

        const alias = await this.supabase
            .from('vertical_profile_aliases')
            .select('slug')
            .eq('alias', slug)
            .maybeSingle();

        if (!alias.data?.slug) return undefined;

        const via = await this.supabase
            .from('vertical_profiles')
            .select('slug, profile, status, usage_count, prompt_version')
            .eq('slug', alias.data.slug)
            .maybeSingle();

        return via.data ? this.row(via.data) : undefined;
    }

    async put(row: CachedProfile, aliases: string[]): Promise<void> {
        const { error } = await this.supabase.from('vertical_profiles').upsert({
            slug: row.slug,
            profile: row.profile,
            status: row.status,
            usage_count: row.usageCount,
            prompt_version: row.promptVersion ?? null,
        });
        if (error) {
            console.warn('[profile] persist failed:', error.message);
            return;
        }

        for (const alias of aliases) {
            await this.supabase.from('vertical_profile_aliases').upsert(
                { alias, slug: row.slug },
                { onConflict: 'alias', ignoreDuplicates: true },
            );
        }
    }

    async recordUse(slug: string): Promise<void> {
        const hit = await this.get(slug);
        if (!hit) return;
        await this.supabase
            .from('vertical_profiles')
            .update({ usage_count: hit.usageCount + 1 })
            .eq('slug', hit.slug);
    }

    private row(data: {
        slug: string;
        profile: unknown;
        status: CachedProfile['status'];
        usage_count: number;
        prompt_version: string | null;
    }): CachedProfile | undefined {
        const profile = asProfile(data.profile, data.slug);
        if (!profile) return undefined;
        return {
            slug: data.slug,
            profile,
            status: data.status,
            usageCount: data.usage_count,
            promptVersion: data.prompt_version ?? undefined,
        };
    }
}
