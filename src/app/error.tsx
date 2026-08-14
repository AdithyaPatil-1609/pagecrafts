'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { captureError } from '@/lib/observability/capture';

// What a person sees when a page throws while rendering (R4 D14).
//
// Without this file Next serves its own built-in screen — grey, untitled, and in production
// stripped down to a digest string. That is the browser half of "never a bare 500": the API
// has mapped every failure to a real sentence since D10, and until now a crash on the page
// side had nothing written for it at all.
//
// The reassurance is the important line, not the apology. Somebody who has spent an hour
// describing their site needs to know first that it is still there.
export default function PageError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        captureError(error, { tags: { boundary: 'page' } });
    }, [error]);

    return (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
            <h1 className="text-2xl font-semibold text-foreground">This page did not load</h1>

            <p className="text-sm text-muted-foreground">
                Something went wrong on our side. Your work is saved — nothing has been lost.
                Try again, and if it keeps happening go back to your dashboard.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button onClick={reset} variant="default">
                    Try again
                </Button>
                <Link href="/" className={buttonVariants({ variant: 'outline' })}>
                    Go to the dashboard
                </Link>
            </div>

            {/* The digest is the only handle support has to find this exact crash in the
                logs. It is meaningless to the reader, so it is small and last. */}
            {error.digest && (
                <p className="pt-4 text-xs text-muted-foreground">
                    Reference: <span className="font-mono">{error.digest}</span>
                </p>
            )}
        </main>
    );
}
