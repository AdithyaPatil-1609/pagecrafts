// What `/signin` says when an auth round trip sends somebody back (R4 D14).
//
// The email and Google routes cannot return an error envelope: a browser following a link
// or coming back from Google gets a redirect, not JSON. They carry the reason in
// `?error=` on `/signin`. Until now only `expired` had anything written for it — so a failed
// Google sign-in dropped the user on an ordinary-looking page with no explanation at all,
// which reads as the button being broken.
//
// Every value any auth route redirects with must have an entry here. The test in
// tests/unit/landing-errors.test.ts reads the routes and fails if one is added without a
// message, because an unmapped code is a silent failure by definition.
export const LANDING_ERRORS: Record<string, string> = {
    expired: 'That link has expired or was already used. Ask for a new one below.',
    google_denied:
        'You cancelled the Google sign-in. You can try again, or use your email and password below.',
    google_failed:
        'We could not finish signing you in with Google. Try again, or use your email and password below.',
    google_unavailable:
        'Google sign-in is unavailable right now. You can still sign in with your email and password below.',
};

/**
 * The sentence for a code, or null when there is nothing to say.
 *
 * An unknown value returns null rather than a generic apology: `?error=` is in the URL and
 * anybody can type anything into it, and showing "something went wrong" because a stranger
 * pasted a query string would be alarming for no reason.
 */
export function landingError(code: string | undefined | null): string | null {
    if (!code) return null;
    return LANDING_ERRORS[code] ?? null;
}
