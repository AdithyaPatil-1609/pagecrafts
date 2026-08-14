'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/observability/capture';

// The last net (R4 D14).
//
// error.tsx sits inside the root layout, so a crash in the layout itself — or in anything it
// renders before the page — escapes it. This one replaces the whole document instead, which
// is why it has to carry its own <html> and <body>: at this point React has thrown the
// layout away, so there is nothing to nest inside.
//
// Deliberately plain. It cannot rely on the app's fonts, its stylesheet or any component,
// because a failure in any one of those is a reason this file is being shown at all. The
// styles are inline for the same reason.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        captureError(error, { tags: { boundary: 'global' } });
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    background: '#ffffff',
                    color: '#18181b',
                }}
            >
                <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
                        PageCraft could not load
                    </h1>

                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#52525b', margin: 0 }}>
                        Something went wrong on our side. Your saved work is safe. Reload the page,
                        and if it keeps happening please try again in a few minutes.
                    </p>

                    <button
                        onClick={reset}
                        style={{
                            marginTop: '1.5rem',
                            padding: '0.5rem 1.25rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#ffffff',
                            background: '#18181b',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                        }}
                    >
                        Reload
                    </button>

                    {error.digest && (
                        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                            Reference: <span style={{ fontFamily: 'monospace' }}>{error.digest}</span>
                        </p>
                    )}
                </main>
            </body>
        </html>
    );
}
