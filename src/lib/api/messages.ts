import type { ErrorCode } from '@/lib/contracts';

export const OFFLINE_MESSAGE = 'We could not reach PageCrafts. Check your connection and try again.';

export const UNREADABLE_MESSAGE = 'The server sent back something we could not read.';

const FRIENDLY: Record<ErrorCode, string> = {
    unauthorized: 'Please sign in again to continue.',
    forbidden: 'This project belongs to someone else.',
    not_found: 'We could not find this project.',
    // Said as "nothing was lost" first, because the person's fear on seeing a failed save is
    // that their work is gone. It is not: the write was refused before anything changed.
    conflict: 'This project was changed somewhere else. Nothing was lost — reload to get the latest version, then save again.',
    rate_limited: 'That was a lot of saves at once. Wait a moment and try again.',
    spend_capped: 'The daily limit has been reached. Please try again tomorrow.',
    // No mention of files: this code is returned by the describe form, the content
    // panel and the file save alike, and only one of those has files in it.
    validation_failed: 'Something in that was not accepted.',
    payload_too_large: 'That was too large to send.',
    generation_failed: 'The site could not be generated.',
    payment_required: 'This needs an upgrade before it can run.',
    hosting_error: 'The hosting service did not respond.',
    service_unavailable: 'PageCrafts is having trouble right now. Your work is safe. Try again in a moment.',
    internal: 'We could not finish that just now. Your work is safe in this tab — try again in a moment.',
};

/**
 * The server's own words, when it has any; ours only when it does not.
 *
 * This used to read `FRIENDLY[code] ?? fallback`, and FRIENDLY is a Record over every
 * ErrorCode -- so the left side was never undefined and the fallback was dead code. The
 * effect was that a route which had gone to the trouble of saying "Enter a valid email
 * address" had it replaced with "Some of your files were rejected", on a form with no
 * files anywhere near it.
 *
 * Ours are written for the case where a route gives nothing back, and they have to stay
 * vague because they cover every screen at once. A specific message beats a vague one,
 * so the specific one wins.
 */
export function friendlyMessage(code: ErrorCode, fromServer: string): string {
    const specific = fromServer?.trim();

    return specific ? specific : FRIENDLY[code];
}