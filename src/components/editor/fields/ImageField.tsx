'use client';
import { ImagePlus, Trash2 } from 'lucide-react';
import FieldShell from './FieldShell';

// FieldType "image" — a slot, not a URL box. The value shown is whatever the page is
// currently pointing at; changing it opens the library, and every picture in a project
// arrives that way (S-1).

export interface ImageFieldProps {
    id: string;
    label: string;
    value: string | null;
    issue?: string | null;
    onOpenLibrary: () => void;
    onClear: () => void;
}

export default function ImageField({
    id,
    label,
    value,
    issue,
    onOpenLibrary,
    onClear,
}: ImageFieldProps) {
    return (
        <FieldShell id={id} label={label} issue={issue}>
            <div className="flex items-center gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                    {value ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={value} alt="" className="size-full object-cover" />
                    ) : (
                        <ImagePlus aria-hidden className="size-5 text-muted-foreground" />
                    )}
                </div>

                <div className="flex min-w-0 flex-col items-start gap-1.5">
                    <button
                        id={id}
                        type="button"
                        onClick={onOpenLibrary}
                        className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted"
                    >
                        {value ? 'Replace photo' : 'Choose a photo'}
                    </button>

                    {value && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 aria-hidden className="size-3" />
                            Remove
                        </button>
                    )}
                </div>
            </div>
        </FieldShell>
    );
}
