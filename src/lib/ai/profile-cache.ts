import { profile as generateProfile, normaliseSlug } from './profile';
import type { AiResult, Usage, VerticalProfile } from '@/lib/contracts';

export type ProfileStatus = 'ai_generated' | 'curated' | 'rejected';

export interface CachedProfile {
    slug: string;
    profile: VerticalProfile;
    status: ProfileStatus;
    usageCount: number;
    promptVersion?: string;
}

/**
 * The persistence seam. In-memory until the `vertical_profiles` table is
 * provisioned (E1); swapping it is this one interface.
 */
export interface ProfileStore {
    /** Resolves a slug **or an alias** to a cached row. */
    get(slug: string): Promise<CachedProfile | undefined>;
    put(row: CachedProfile, aliases: string[]): Promise<void>;
    recordUse(slug: string): Promise<void>;
}

class MemoryProfileStore implements ProfileStore {
    private readonly rows = new Map<string, CachedProfile>();
    private readonly aliases = new Map<string, string>();

    async get(slug: string): Promise<CachedProfile | undefined> {
        const direct = this.rows.get(slug);
        if (direct) return direct;

        const via = this.aliases.get(slug);
        return via ? this.rows.get(via) : undefined;
    }

    async put(row: CachedProfile, aliases: string[]): Promise<void> {
        this.rows.set(row.slug, row);
        for (const alias of aliases) {
            // An alias never overwrites a real vertical, and the first claim on
            // an alias wins — otherwise a later profile silently steals it.
            if (this.rows.has(alias) || this.aliases.has(alias)) continue;
            this.aliases.set(alias, row.slug);
        }
    }

    async recordUse(slug: string): Promise<void> {
        const row = await this.get(slug);
        if (row) row.usageCount += 1;
    }
}

let store: ProfileStore = new MemoryProfileStore();

export function profileStore(): ProfileStore {
    return store;
}

export function setProfileStore(next: ProfileStore | null): void {
    store = next ?? new MemoryProfileStore();
    inFlight.clear();
}

const NO_USAGE: Usage = { model: 'cache', inputTokens: 0, outputTokens: 0, latencyMs: 0 };

/**
 * Requests for the same slug that arrive while a generation is in flight join
 * that generation rather than starting their own.
 *
 * Without this, the first ten users to ask for a vertical on a cold cache each
 * pay for a profile — the exact case the cache exists to prevent, and the one
 * that happens on launch day rather than in testing.
 */
const inFlight = new Map<string, Promise<AiResult<VerticalProfile>>>();

export interface CachedResult extends AiResult<VerticalProfile> {
    /** False when this call paid a provider. */
    cached: boolean;
    /** Set when an alias resolved to a different slug — `dentist` → `dental-clinic`. */
    resolvedFrom?: string;
}

/**
 * A profile for a vertical, from cache when possible.
 *
 * Costs zero requests on a repeat vertical, which is what makes a 30-vertical
 * regression run affordable to repeat.
 */
export async function cachedProfile(vertical: string): Promise<CachedResult> {
    const slug = normaliseSlug(vertical);
    if (!slug) throw new Error('cachedProfile: empty vertical slug.');

    const hit = await store.get(slug);
    if (hit && hit.status !== 'rejected') {
        await store.recordUse(slug);
        return {
            data: hit.profile,
            usage: NO_USAGE,
            cached: true,
            ...(hit.slug === slug ? {} : { resolvedFrom: slug }),
        };
    }

    const existing = inFlight.get(slug);
    if (existing) {
        const joined = await existing;
        return { ...joined, cached: true };
    }

    const pending = generateProfile(slug).finally(() => inFlight.delete(slug));
    inFlight.set(slug, pending);

    const result = await pending;

    await store.put(
        {
            slug: result.data.slug,
            profile: result.data,
            // Never `curated` on insert. A human reads it first.
            status: 'ai_generated',
            usageCount: 1,
            promptVersion: result.usage.promptVersion,
        },
        // The model's own alias list is what makes `dentist` resolve to
        // `dental-clinic` without anyone maintaining a synonym table.
        (result.data.aliases ?? []).map(normaliseSlug).filter((a) => a && a !== result.data.slug),
    );

    return { ...result, cached: false };
}
