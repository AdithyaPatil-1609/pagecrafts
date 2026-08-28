'use client';

import type React from 'react';

/**
 * Previously blocked the editor after the free first publish until Rs 249 unlocked editing.
 * Edit-unlock paywall has been removed — this gate now always passes through.
 */
export function EditUnlockGate({
    children,
}: {
    projectId: string;
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

