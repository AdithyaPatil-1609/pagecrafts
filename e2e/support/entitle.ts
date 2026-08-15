import { createClient } from '@supabase/supabase-js';

// Granting a publish entitlement for the publish walk-through (R4 D14).
//
// Nothing a browser can do grants one of these, by design: `grant select on entitlements to
// authenticated` and no insert policy, so a client that could self-grant would be a client
// that publishes for free. The test therefore has to do what the payment webhook does —
// write the row with the service role.
//
// This is the same reason the sign-in tests are gated: it needs a credential CI only has
// when somebody has configured one. Without it the publish walk stops at the paywall, which
// is itself a failure path worth asserting.

export function canGrantEntitlements(): boolean {
    return Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
            process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    );
}

function admin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Give this user the right to publish this one project.
 *
 * `source: 'launch_offer'` rather than 'paid', so nothing in a test run ever looks like a
 * real payment in the data.
 */
export async function grantPublish(userId: string, projectId: string): Promise<void> {
    const { error } = await admin()
        .from('entitlements')
        .insert({
            user_id: userId,
            project_id: projectId,
            kind: 'publish',
            source: 'launch_offer',
            status: 'active',
        });

    if (error) throw new Error(`Could not grant the publish entitlement: ${error.message}`);
}
