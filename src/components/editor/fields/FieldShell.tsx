'use client';
import type { ReactNode } from 'react';

// The frame every content field shares: its label, the control, its inline message. One
// place, so a new FieldType inherits the spacing, the error colour and the description
// wiring without deciding any of them again.

export interface FieldShellProps {
    id: string;
    label: string;
    issue?: string | null;
    hint?: string | null;
    children: ReactNode;
}

export default function FieldShell({ id, label, issue, hint, children }: FieldShellProps) {
    const messageId = issue ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-xs font-medium text-foreground">
                {label}
            </label>

            {children}

            {issue ? (
                <p id={messageId} role="alert" className="text-xs text-destructive">
                    {issue}
                </p>
            ) : hint ? (
                <p id={messageId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

export const controlClass =
    'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground ' +
    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background';

export const invalidClass = 'border-destructive';

/** The characters-remaining line a capped field carries, or null when it has no cap. */
export function lengthHint(value: string, maxLength?: number): string | null {
    if (maxLength === undefined) return null;
    return `${value.length} / ${maxLength}`;
}
