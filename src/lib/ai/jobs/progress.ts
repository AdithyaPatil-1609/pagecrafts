import type { Job } from './types';

/** Section types named by the plan event, or inferred from completed section events. */
export function plannedSectionTypes(job: Job): string[] {
    const plan = job.events.find((event) => event.name === 'plan');
    const types = plan?.data?.types;
    if (Array.isArray(types)) {
        return types.filter((value): value is string => typeof value === 'string' && value.length > 0);
    }
    return job.events
        .filter((event) => event.name === 'section')
        .map((event) => event.data?.type)
        .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

/** First finished look, else the files written as sections stream in. */
export function jobPreviewHtml(job: Job): string | undefined {
    const fromLooks = job.variants?.find((option) => option.files['index.html'])?.files['index.html'];
    const html = fromLooks || job.files?.['index.html'];
    return html || undefined;
}
