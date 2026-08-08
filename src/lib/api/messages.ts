import type { ErrorCode } from '@/lib/contracts';

export const OFFLINE_MESSAGE = 'We could not reach PageCraft. Check your connection and try again.';

export const UNREADABLE_MESSAGE = 'The server sent back something we could not read.';

const FRIENDLY: Record<ErrorCode, string> = {
    unauthorized: 'Please sign in again to continue.',
    forbidden: 'This project belongs to someone else.',
    not_found: 'We could not find this project.',
    rate_limited: 'That was a lot of saves at once. Wait a moment and try again.',
    spend_capped: 'The daily limit has been reached. Please try again tomorrow.',
    validation_failed: 'Some of your files were rejected.',
    generation_failed: 'The site could not be generated.',
    payment_required: 'This needs an upgrade before it can run.',
    hosting_error: 'The hosting service did not respond.',
    internal: 'Something went wrong on our side. Your work is safe in this tab.',
};

export function friendlyMessage(code: ErrorCode, fallback: string): string {
    return FRIENDLY[code] ?? fallback;
}