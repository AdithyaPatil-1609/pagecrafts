'use client';
import FieldShell, { controlClass, invalidClass, lengthHint } from './FieldShell';

// FieldType "text" — a headline, a button label, a name. Capped by the schema, because the
// design was drawn for a length.

export interface TextFieldProps {
    id: string;
    label: string;
    value: string;
    maxLength?: number;
    issue?: string | null;
    onChange: (value: string) => void;
}

export default function TextField({ id, label, value, maxLength, issue, onChange }: TextFieldProps) {
    return (
        <FieldShell id={id} label={label} issue={issue} hint={lengthHint(value, maxLength)}>
            <input
                id={id}
                type="text"
                value={value}
                aria-invalid={issue ? true : undefined}
                aria-describedby={issue ? `${id}-error` : undefined}
                onChange={(e) => onChange(e.target.value)}
                className={`${controlClass} ${issue ? invalidClass : ''}`}
            />
        </FieldShell>
    );
}
