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
// styles are inline for the same reason, and the colours are the only hard-coded hexes in
// the product — a `var(--background)` here would resolve to nothing, since globals.css is
// exactly what may not have loaded.
//
// They are the dark palette's values, copied from globals.css and named below. This screen
// rendered white until R2 D19, which made the last thing a person sees look like a different
// product: PageCraft is dark-first, and the near-black surface is the identity rather than a
// preference (docs/design-tokens.md). If the palette changes, change these with it — nothing
// can do it automatically, which is the price of a screen that works when nothing else does.
// The dark palette, from src/app/globals.css. Kept together so the drift is obvious.
const BACKGROUND = '#07070b'; // --background
const FOREGROUND = '#f5f5f7'; // --foreground
const MUTED = '#9b9ba6'; // --muted-foreground
const BRAND = '#dc2626'; // --primary
const ON_BRAND = '#ffffff'; // --primary-foreground

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
                    background: BACKGROUND,
                    color: FOREGROUND,
                }}
            >
                <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
                        PageCraft could not load
                    </h1>

                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: MUTED, margin: 0 }}>
                        This is our fault, not yours, and your saved work is safe. Reload the page —
                        if it keeps happening, try again in a few minutes.
                    </p>

                    <button
                        onClick={reset}
                        style={{
                            marginTop: '1.5rem',
                            padding: '0.5rem 1.25rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: ON_BRAND,
                            background: BRAND,
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                        }}
                    >
                        Reload
                    </button>

                    {error.digest && (
                        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: MUTED }}>
                            Reference: <span style={{ fontFamily: 'monospace' }}>{error.digest}</span>
                        </p>
                    )}
                </main>
            </body>
        </html>
    );
}
