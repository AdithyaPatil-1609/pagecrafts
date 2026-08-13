'use client';
import FieldShell, { controlClass, invalidClass } from './FieldShell';

// FieldType "richtext" — the long-form field, deliberately uncapped (see the conventions
// doc). It is a textarea rather than a formatting toolbar: the value is written into the
// page escaped, so what the person types is what the page says and nothing else.

export interface RichTextFieldProps {
    id: string;
    label: string;
    value: string;
    issue?: string | null;
    onChange: (value: string) => void;
}

export default function RichTextField({ id, label, value, issue, onChange }: RichTextFieldProps) {
    return (
        <FieldShell id={id} label={label} issue={issue}>
            <textarea
                id={id}
                rows={4}
                value={value}
                aria-invalid={issue ? true : undefined}
                aria-describedby={issue ? `${id}-error` : undefined}
                onChange={(e) => onChange(e.target.value)}
                className={`${controlClass} resize-y ${issue ? invalidClass : ''}`}
            />
        </FieldShell>
    );
}
