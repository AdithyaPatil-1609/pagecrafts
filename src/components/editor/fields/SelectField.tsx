'use client';
import FieldShell, { controlClass, invalidClass } from './FieldShell';

// FieldType "select" — a closed choice. The options come from the schema and nowhere else,
// so a design cannot offer a value the write path would refuse.

export interface SelectFieldProps {
    id: string;
    label: string;
    value: string;
    options: string[];
    issue?: string | null;
    onChange: (value: string) => void;
}

export default function SelectField({
    id,
    label,
    value,
    options,
    issue,
    onChange,
}: SelectFieldProps) {
    // A stored value the design has since dropped still shows, marked, rather than silently
    // reading as the first option.
    const known = options.includes(value);

    return (
        <FieldShell id={id} label={label} issue={issue}>
            <select
                id={id}
                value={known ? value : ''}
                aria-invalid={issue ? true : undefined}
                aria-describedby={issue ? `${id}-error` : undefined}
                onChange={(e) => onChange(e.target.value)}
                className={`${controlClass} ${issue ? invalidClass : ''}`}
            >
                {!known && <option value="">Choose one…</option>}
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </FieldShell>
    );
}
