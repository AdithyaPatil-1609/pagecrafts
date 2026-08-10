'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentSchema, Field, SiteMeta } from '@/lib/contracts';
import { applyContentToFiles } from '@/lib/content/to-files';
import { useEditorStore } from '@/lib/editor-store';
import {
    loadProjectContent,
    saveContentOps,
    saveSiteMeta,
} from '@/lib/project-content-source';

// Screen 07 — the content panel (R2 D8).
//
// Generated from content_schema and nothing else (C-07). There is deliberately no branch on
// template id, name or category anywhere below: the first design that appears to need its
// own control is a FieldType to add here, not a special case to smuggle in, because a
// special case is invisible to every other design and rots silently when that one changes.
//
// Saving is per field and debounced. The alternative — one Save button over the whole panel
// — sounds tidier and is worse: it makes an edit something you can lose by navigating away,
// and it batches unrelated fields into one request so a single rejected value fails the lot.

const SAVE_DELAY_MS = 600;

function textValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

const INPUT_CLASS =
    'w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground';

function TextRow({
    label,
    value,
    error,
    multiline = false,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    multiline?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm">{label}</span>
            {multiline ? (
                <textarea
                    className={INPUT_CLASS}
                    rows={3}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            ) : (
                <input
                    className={INPUT_CLASS}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
            {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
        </label>
    );
}

/**
 * One control per FieldType. The whole of the panel's per-design behaviour lives in this
 * switch, which is what keeps "no per-template UI" true rather than aspirational.
 */
export function FieldControl({
    field,
    value,
    error,
    onChange,
}: {
    field: Field;
    value: unknown;
    error?: string;
    onChange: (value: unknown) => void;
}) {
    const label = field.maxLength ? `${field.label} (max ${field.maxLength})` : field.label;

    switch (field.type) {
        case 'richtext':
            return (
                <TextRow
                    label={label}
                    value={textValue(value)}
                    error={error}
                    multiline
                    onChange={onChange}
                />
            );

        case 'color':
            return (
                <label className="block">
                    <span className="mb-1 block text-sm">{field.label}</span>
                    <input
                        type="color"
                        aria-label={field.label}
                        className="h-8 w-16 rounded border border-border bg-background"
                        value={textValue(value) || '#000000'}
                        onChange={(event) => onChange(event.target.value)}
                    />
                    {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
                </label>
            );

        case 'select':
            return (
                <label className="block">
                    <span className="mb-1 block text-sm">{field.label}</span>
                    <select
                        className={INPUT_CLASS}
                        value={textValue(value)}
                        onChange={(event) => onChange(event.target.value)}
                    >
                        <option value="">Choose…</option>
                        {(field.options ?? []).map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                    {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
                </label>
            );

        case 'image':
            // The picker is D12. Until then the slot says what it holds and admits it cannot
            // be changed here yet, which is more use than an input that does nothing.
            return (
                <div className="block">
                    <span className="mb-1 block text-sm">{field.label}</span>
                    <p className="rounded border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground">
                        {typeof value === 'string' && value
                            ? 'An image is set. Choosing images arrives with the picker.'
                            : 'No image chosen yet.'}
                    </p>
                </div>
            );

        case 'list':
            // Editing the items is D9; add / remove / reorder is D11. Showing them read-only
            // means the panel already describes the whole page rather than the half of it
            // that happens to be scalar.
            return (
                <div className="block">
                    <span className="mb-1 block text-sm">{field.label}</span>
                    <ul className="space-y-1">
                        {(Array.isArray(value) ? value : []).map((item, index) => (
                            <li
                                key={index}
                                className="rounded border border-border px-2 py-1 text-xs text-muted-foreground"
                            >
                                {Object.values((item ?? {}) as Record<string, unknown>)
                                    .filter((cell) => typeof cell === 'string')
                                    .join(' — ') || `Item ${index + 1}`}
                            </li>
                        ))}
                    </ul>
                </div>
            );

        case 'text':
        default:
            return (
                <TextRow label={label} value={textValue(value)} error={error} onChange={onChange} />
            );
    }
}

export default function ContentPanel({ projectId }: { projectId: string }) {
    const [schema, setSchema] = useState<ContentSchema>({ sections: [] });
    const [content, setContent] = useState<Record<string, unknown>>({});
    const [siteMeta, setSiteMeta] = useState<SiteMeta>({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const vfs = useEditorStore((s) => s.vfs);
    const refresh = useEditorStore((s) => s.refresh);

    // One timer per field path, so typing in the headline never cancels a pending save of
    // the subheading.
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        let cancelled = false;

        void loadProjectContent(projectId).then((result) => {
            if (cancelled) return;
            setSchema(result.schema);
            setContent(result.content);
            setSiteMeta(result.siteMeta);
            setLoadError(result.error);
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    // Clearing the timers on unmount cancels the wait, never a request already sent.
    useEffect(() => {
        const pending = timers.current;
        return () => {
            for (const timer of pending.values()) clearTimeout(timer);
        };
    }, []);

    // The preview renders from the working tree, so an edit has to reach the markup as well
    // as the server. Writing it here also keeps the two in step: the file and content_json
    // say the same thing from the moment the field changes, which is the invariant restore
    // and fork are already held to (R3 D7).
    const renderPreview = useCallback(
        (next: Record<string, unknown>, activeSchema: ContentSchema) => {
            const files = vfs.toMap();
            const applied = applyContentToFiles(files, next, activeSchema);
            if (applied === files) return;

            vfs.write('index.html', applied['index.html']);
            refresh();
        },
        [vfs, refresh],
    );

    const queueSave = useCallback((path: string, run: () => Promise<string | null>) => {
        const existing = timers.current.get(path);
        if (existing) clearTimeout(existing);

        timers.current.set(
            path,
            setTimeout(() => {
                timers.current.delete(path);
                void run().then((error) => {
                    // Kept against the field rather than raised as a banner: the person needs
                    // to know *which* value the server would not take, and "some edits were
                    // invalid" over the whole panel makes them hunt for it.
                    setFieldErrors((current) => {
                        const next = { ...current };
                        if (error) next[path] = error;
                        else delete next[path];
                        return next;
                    });
                });
            }, SAVE_DELAY_MS),
        );
    }, []);

    const editField = useCallback(
        (sectionKey: string, fieldKey: string, value: unknown) => {
            const path = `${sectionKey}.${fieldKey}`;

            setContent((current) => {
                const section = { ...((current[sectionKey] as Record<string, unknown>) ?? {}) };
                section[fieldKey] = value;
                const next = { ...current, [sectionKey]: section };

                renderPreview(next, schema);
                return next;
            });

            queueSave(path, () => saveContentOps(projectId, [{ path, value }]));
        },
        [projectId, queueSave, renderPreview, schema],
    );

    const editSiteMeta = useCallback(
        (key: keyof SiteMeta, value: string) => {
            const next = { ...siteMeta, [key]: value };
            setSiteMeta(next);
            queueSave(`site_meta.${key}`, () => saveSiteMeta(projectId, next));
        },
        [projectId, queueSave, siteMeta],
    );

    if (loading) {
        return <p className="p-4 text-sm text-muted-foreground">Loading your content…</p>;
    }

    if (loadError) {
        return <p className="p-4 text-sm text-destructive">{loadError}</p>;
    }

    return (
        <div className="space-y-6 p-4">
            {schema.sections.length === 0 ? (
                // Generated projects have no schema, and a design can be retired. Saying so
                // is better than an empty panel that just looks broken.
                <p className="text-sm text-muted-foreground">
                    This site has no editable content fields. You can still edit it as code.
                </p>
            ) : (
                schema.sections.map((section) => (
                    <section key={section.key} className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground">{section.label}</h2>

                        {section.fields.map((field) => (
                            <FieldControl
                                key={field.key}
                                field={field}
                                value={(content[section.key] as Record<string, unknown>)?.[field.key]}
                                error={fieldErrors[`${section.key}.${field.key}`]}
                                onChange={(value) => editField(section.key, field.key, value)}
                            />
                        ))}
                    </section>
                ))
            )}

            <section className="space-y-3 border-t border-border pt-5">
                <h2 className="text-sm font-semibold text-muted-foreground">Site details</h2>
                <p className="text-xs text-muted-foreground">
                    Used for the browser tab, and for the card people see when your site is shared.
                </p>

                <TextRow
                    label="Title"
                    value={siteMeta.title ?? ''}
                    error={fieldErrors['site_meta.title']}
                    onChange={(value) => editSiteMeta('title', value)}
                />
                <TextRow
                    label="Description"
                    value={siteMeta.description ?? ''}
                    error={fieldErrors['site_meta.description']}
                    multiline
                    onChange={(value) => editSiteMeta('description', value)}
                />
            </section>
        </div>
    );
}
