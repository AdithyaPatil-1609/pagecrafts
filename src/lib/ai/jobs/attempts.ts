import type { StyleOption } from '../generate/options';
import type { StyleId, StyleTier } from '../generate/styles';
import type { Job } from './types';

export interface PublicVariant {
    id: StyleId;
    label: string;
    blurb: string;
    tier: StyleTier;
    price_inr: number;
    html: string;
}

export interface GenerationAttempt {
    job_id: string;
    index: number;
    variants: PublicVariant[];
}

export function publicVariant(option: StyleOption): PublicVariant {
    return {
        id: option.id,
        label: option.label,
        blurb: option.blurb,
        tier: option.tier,
        price_inr: option.priceInr,
        html: option.files['index.html'] ?? '',
    };
}

/** Finished look-sets for a project, oldest first — so earlier tries stay pickable. */
export function attemptsFromJobs(jobs: readonly Job[]): GenerationAttempt[] {
    return jobs
        .filter((job) => job.status === 'done' && (job.variants?.length ?? 0) > 0)
        .map((job, index) => ({
            job_id: job.id,
            index: index + 1,
            variants: (job.variants ?? []).map(publicVariant),
        }));
}
