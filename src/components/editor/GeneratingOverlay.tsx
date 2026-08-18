'use client';

import { Sparkles } from 'lucide-react';

import type { JobStatus } from '@/lib/ai/jobs/types';

const COPY: Partial<Record<JobStatus, string>> = {
    queued: 'Starting…',
    planning: 'Planning your pages…',
    streaming: 'Writing the pages…',
    validating: 'Putting the site together…',
    repairing: 'Improving a section…',
    done: 'Opening your site…',
    failed: 'Generation did not finish.',
};

export function GeneratingOverlay({
    status,
    sectionsDone,
    sectionsTotal,
    error,
}: {
    status: JobStatus | 'loading';
    sectionsDone: number;
    sectionsTotal: number;
    error?: string | null;
}) {
    const label = status === 'loading'
        ? 'Starting…'
        : (COPY[status] ?? 'Building your website…');
    const total = Math.max(sectionsTotal, 1);
    const done = status === 'done' ? total : Math.min(sectionsDone, total);
    const percent = status === 'loading' ? 8 : Math.round((done / total) * 100);

    return (
        <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 p-6 backdrop-blur-sm"
            role="status"
            aria-live="polite"
        >
            <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
                <span
                    aria-hidden
                    className="brand-halo flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-accent/60 text-primary"
                >
                    <Sparkles className="size-6" strokeWidth={1.75} />
                </span>
                <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">
                        {error
                            ? error
                            : sectionsTotal > 0
                                ? `${done} of ${sectionsTotal} sections`
                                : 'This usually takes under a minute.'}
                    </p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${Math.max(percent, 8)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
