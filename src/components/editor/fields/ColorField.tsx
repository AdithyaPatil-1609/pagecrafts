'use client';
import FieldShell, { controlClass, invalidClass } from './FieldShell';

// FieldType "color" — the swatch and the hex, side by side. The swatch cannot express an
// invalid colour, so the text box stays authoritative and carries the message.

export interface ColorFieldProps {
    id: string;
    label: string;
    value: string;
    issue?: string | null;
    onChange: (value: string) => void;
}

const FALLBACK = '#000000';
const FULL_HEX = /^#[0-9a-fA-F]{6}$/;

export default function ColorField({ id, label, value, issue, onChange }: ColorFieldProps) {
    return (
        <FieldShell id={id} label={label} issue={issue}>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    aria-label={`${label} swatch`}
                    value={FULL_HEX.test(value) ? value : FALLBACK}
                    onChange={(e) => onChange(e.target.value)}
                    className="size-8 shrink-0 cursor-pointer rounded border border-border bg-background p-0.5"
                />
                <input
                    id={id}
                    type="text"
                    value={value}
                    spellCheck={false}
                    placeholder="#1a2b3c"
                    aria-invalid={issue ? true : undefined}
                    aria-describedby={issue ? `${id}-error` : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${controlClass} font-mono ${issue ? invalidClass : ''}`}
                />
            </div>
        </FieldShell>
    );
}
