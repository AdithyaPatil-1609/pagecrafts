import 'server-only';
import type { ErrorCode } from '@/lib/contracts/error-codes';
import { redact } from './credentials';

export class PublishError extends Error {
    constructor(
        readonly code: ErrorCode,
        message: string,
        readonly detail?: string,
        /**
         * The site that had already been claimed when this failed, if one had.
         *
         * A publish that dies after provisioning has taken a subdomain on the host. Losing
         * that fact means the retry re-derives the address, finds it taken by the site we
         * just abandoned, and publishes to `name-2` instead — so a transient upload error
         * silently moves somebody's address and leaves the first site orphaned (R3 D17).
         */
        readonly siteId?: string | null,
    ) {
        super(message);
        this.name = 'PublishError';
    }
}

const STAGE_MESSAGE: Record<string, string> = {
    provisioning: 'We could not set up a home for your site.',
    pushing: 'We could not upload your site files.',
    enabling_hosting: 'We could not switch your site on.',
    verifying: 'Your site is taking longer than usual to appear.',
};

export function toPublishError(
    stage: string,
    error: unknown,
    siteId?: string | null,
): PublishError {
    if (error instanceof PublishError) {
        // An inner PublishError may have been raised before the site id was known. Carry it
        // through rather than dropping it, and never overwrite one that is already set.
        return error.siteId || !siteId
            ? error
            : new PublishError(error.code, error.message, error.detail, siteId);
    }

    const detail = error instanceof Error ? error.message : String(error);

    return new PublishError(
        'hosting_error',
        STAGE_MESSAGE[stage] ?? 'Publishing failed.',
        redact(detail),
        siteId ?? null,
    );
}

export function notEntitled(): PublishError {
    return new PublishError(
        'payment_required',
        'Publishing needs to be unlocked before this site can go live.',
    );
}