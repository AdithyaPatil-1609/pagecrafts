/**
 * The landing page's light source: two red blooms and a pair of sweeping arcs
 * behind the content. Decorative only.
 */
export function LandingBackdrop() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="brand-bloom absolute -bottom-64 -left-56 size-[52rem] rounded-full blur-3xl" />
            <div className="brand-bloom absolute -top-72 right-[8%] size-[46rem] rounded-full opacity-70 blur-3xl" />

            <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 1440 900"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
            >
                <defs>
                    <linearGradient id="pagecraft-arc" x1="0" y1="900" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="var(--brand-to)" stopOpacity="0" />
                        <stop offset="45%" stopColor="var(--brand-from)" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="var(--brand-from)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d="M -80 980 C 420 900 780 600 900 120 C 950 -80 1010 -160 1120 -260"
                    stroke="url(#pagecraft-arc)"
                    strokeWidth="2.5"
                />
                <path
                    d="M -220 1080 C 180 1010 460 820 600 460"
                    stroke="url(#pagecraft-arc)"
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                />
            </svg>
        </div>
    );
}
