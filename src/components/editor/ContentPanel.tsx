'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetKind, ContentSchema, Field, SiteMeta } from '@/lib/contracts';
import { applyContentToFiles } from '@/lib/content/to-files';
import { validateFieldValue } from '@/lib/content/apply-ops';
import { addItem, moveItem, removeItem } from '@/lib/content/list-ops';
import { useEditorStore } from '@/lib/editor-store';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { PhotoResult } from '@/lib/data/unsplash-search';
import {
    loadProjectContent,
    pickPhoto,
    saveContentOps,
    saveSiteMeta,
    searchPhotos,
    uploadPhoto,
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
 * The asset picker (R2 D12).
 *
 * Two ways in, because they fail differently: search depends on a third party and an hourly
 * quota, upload depends on nothing but the person's own machine. When search is down or
 * spent, the dialog still offers upload rather than becoming a dead end — which is why the
 * search error is shown inside the panel instead of replacing it.
 *
 * Both paths end at the same place: POST /assets creates a row this project owns, and the
 * slot is set to that id. Nothing here ever holds an Unsplash URL — the server downloads
 * the file, so a picture cannot vanish later because somebody deleted it upstream.
 */
function AssetPicker({
    label,
    projectId,
    kind,
    onPicked,
}: {
    label: string;
    projectId: string;
    kind: AssetKind;
    onPicked: (assetId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PhotoResult[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runSearch = useCallback(async () => {
        if (!query.trim()) return;
        setBusy(true);
        setError(null);

        const { items, error: failure } = await searchPhotos(query);
        setResults(items);
        setError(failure);
        setBusy(false);
    }, [query]);

    const choose = useCallback(
        async (unsplashId: string) => {
            setBusy(true);
            setError(null);

            const { asset, error: failure } = await pickPhoto(projectId, unsplashId, kind);
            setBusy(false);

            if (failure || !asset) {
                setError(failure);
                return;
            }
            onPicked(asset.id);
            setOpen(false);
        },
        [projectId, kind, onPicked],
    );

    const upload = useCallback(
        async (file: File) => {
            setBusy(true);
            setError(null);

            const { asset, error: failure } = await uploadPhoto(projectId, file, kind);
            setBusy(false);

            if (failure || !asset) {
                setError(failure);
                return;
            }
            onPicked(asset.id);
            setOpen(false);
        },
        [projectId, kind, onPicked],
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="rounded border border-border px-2 py-0.5 text-xs text-foreground hover:bg-accent"
                >
                    Choose
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Choose an image — {label}</DialogTitle>
                    <DialogDescription>
                        Search free photos, or upload one of your own. Either way we save a copy,
                        so your site keeps working whatever happens to the original.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {/* A form, so Enter searches — the key everybody presses in a search box. */}
                    <form
                        className="flex gap-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void runSearch();
                        }}
                    >
                        <input
                            className={INPUT_CLASS}
                            placeholder="coffee, workshop, mountains…"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            aria-label="Search free photos"
                        />
                        <button
                            type="submit"
                            disabled={busy || !query.trim()}
                            className="shrink-0 rounded border border-border px-3 py-1 text-sm hover:bg-accent disabled:opacity-50"
                        >
                            {busy ? 'Working…' : 'Search'}
                        </button>
                    </form>

                    {error && (
                        <p role="alert" className="text-xs text-destructive">
                            {error}
                        </p>
                    )}

                    {results.length > 0 && (
                        <ul className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
                            {results.map((photo) => (
                                <li key={photo.id}>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void choose(photo.id)}
                                        className="block w-full overflow-hidden rounded border border-border hover:border-primary disabled:opacity-50"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo.thumbUrl}
                                            alt={photo.description || 'Photo'}
                                            className="h-20 w-full object-cover"
                                            loading="lazy"
                                        />
                                        {/* The credit rides with the thumbnail because showing it
                                            is a licence condition, not a courtesy — and the moment
                                            to establish that is before the picture is chosen. */}
                                        <span className="block truncate px-1 py-0.5 text-[10px] text-muted-foreground">
                                            {photo.credit.name}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <label className="block border-t border-border pt-3">
                        <span className="mb-1 block text-sm">Or upload your own</span>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                            disabled={busy}
                            className="block w-full text-xs text-muted-foreground"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void upload(file);
                            }}
                        />
                    </label>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * An image slot, wherever one appears — a content field or a site-wide setting.
 *
 * Choosing an image needs the picker (D12), so the slot says what it holds rather than
 * offering an input that does nothing. Clearing, though, is possible today and is offered:
 * the schema has always accepted null for an image, and someone who has put the wrong
 * picture on their site should not have to wait two days to take it off again.
 *
 * The asset id itself is deliberately not shown. It is a uuid — it tells the owner nothing,
 * and inviting them to type one is inviting a broken reference.
 */
function AssetSlot({
    label,
    assetId,
    error,
    projectId,
    kind,
    onSet,
    onClear,
}: {
    label: string;
    assetId: string | null;
    error?: string;
    projectId: string;
    kind: AssetKind;
    onSet: (assetId: string) => void;
    onClear: () => void;
}) {
    return (
        <div className="block">
            <span className="mb-1 block text-sm">{label}</span>
            <div className="flex items-center gap-2 rounded border border-dashed border-border px-2 py-1.5">
                <p className="flex-1 text-xs text-muted-foreground">
                    {assetId ? 'An image is set.' : 'No image chosen yet.'}
                </p>
                <AssetPicker label={label} projectId={projectId} kind={kind} onPicked={onSet} />
                {assetId && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="rounded border border-border px-2 py-0.5 text-xs text-foreground hover:bg-accent"
                    >
                        Clear
                    </button>
                )}
            </div>
            {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
        </div>
    );
}

/**
 * A repeatable list — the cards on a page (R2 D9, finished at D11).
 *
 * Items can be edited, added, removed and reordered. Every cell is a field in its own right
 * with its own type and cap, so each one goes through the same controls as a top-level
 * field rather than being assumed to be text — which is also why adding an item does not
 * mean adding an empty object (see blankItem).
 *
 * A list is set whole, as one op, because that is what the write path accepts: content_json
 * holds the array, and sending "item 2's title" as its own edit would need a path shape
 * neither the schema nor applyContentOps has.
 */
function ListRows({
    field,
    value,
    error,
    projectId,
    onChange,
}: {
    field: Field;
    value: unknown;
    error?: string;
    projectId: string;
    onChange: (value: unknown) => void;
}) {
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    const itemSchema = field.itemSchema ?? [];

    const editCell = (index: number, key: string, cell: unknown) => {
        const next = items.map((item, i) => (i === index ? { ...item, [key]: cell } : item));
        onChange(next);
    };

    return (
        <div className="block">
            <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm">{field.label}</span>
                <button
                    type="button"
                    onClick={() => onChange(addItem(items, itemSchema))}
                    className="rounded border border-border px-2 py-0.5 text-xs text-foreground hover:bg-accent"
                >
                    Add item
                </button>
            </div>

            {items.length === 0 ? (
                <p className="rounded border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground">
                    Nothing in this list yet.
                </p>
            ) : (
                <ul className="space-y-3">
                    {items.map((item, index) => (
                        <li key={index} className="space-y-2 rounded border border-border p-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Item {index + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                    {/* Hidden rather than disabled at the ends: a button that
                                        looks pressable and does nothing is worse than one that
                                        is not there. moveItem agrees — it refuses to clamp. */}
                                    {index > 0 && (
                                        <button
                                            type="button"
                                            aria-label={`Move item ${index + 1} up`}
                                            onClick={() => onChange(moveItem(items, index, -1))}
                                            className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-accent"
                                        >
                                            ↑
                                        </button>
                                    )}
                                    {index < items.length - 1 && (
                                        <button
                                            type="button"
                                            aria-label={`Move item ${index + 1} down`}
                                            onClick={() => onChange(moveItem(items, index, 1))}
                                            className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-accent"
                                        >
                                            ↓
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        aria-label={`Remove item ${index + 1}`}
                                        onClick={() => onChange(removeItem(items, index))}
                                        className="rounded border border-border px-1.5 py-0.5 text-xs text-destructive hover:bg-accent"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>

                            {itemSchema.map((itemField) => (
                                <FieldControl
                                    key={itemField.key}
                                    field={itemField}
                                    value={item?.[itemField.key]}
                                    projectId={projectId}
                                    onChange={(cell) => editCell(index, itemField.key, cell)}
                                />
                            ))}
                        </li>
                    ))}
                </ul>
            )}

            {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
        </div>
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
    projectId,
    onChange,
}: {
    field: Field;
    value: unknown;
    error?: string;
    projectId: string;
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
            return (
                <AssetSlot
                    label={field.label}
                    assetId={typeof value === 'string' ? value : null}
                    error={error}
                    projectId={projectId}
                    kind="image"
                    onSet={(id) => onChange(id)}
                    onClear={() => onChange(null)}
                />
            );

        case 'list':
            return (
                <ListRows
                    field={field}
                    value={value}
                    error={error}
                    projectId={projectId}
                    onChange={onChange}
                />
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
            const field = schema.sections
                .find((section) => section.key === sectionKey)
                ?.fields.find((f) => f.key === fieldKey);

            // Checked with the same function the route uses (R2 D9), so the panel cannot
            // accept something the server will refuse. The typing is always kept — refusing
            // to render a keystroke because the value is one character over the cap makes
            // the field feel broken, and the person cannot see what they typed to fix it.
            const problem = field ? validateFieldValue(field, value) : null;

            setContent((current) => {
                const section = { ...((current[sectionKey] as Record<string, unknown>) ?? {}) };
                section[fieldKey] = value;
                const next = { ...current, [sectionKey]: section };

                // The preview follows valid content only. Showing an over-long headline on
                // the page would promise a save that is not going to happen.
                if (!problem) renderPreview(next, schema);
                return next;
            });

            setFieldErrors((current) => {
                const next = { ...current };
                if (problem) next[path] = problem;
                else delete next[path];
                return next;
            });

            if (problem) {
                // Nothing queued: a request certain to come back 422 costs a round trip and
                // tells the person nothing they are not already being told, inline.
                const existing = timers.current.get(path);
                if (existing) clearTimeout(existing);
                timers.current.delete(path);
                return;
            }

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

    // Removing the key rather than writing an empty string: siteMeta is optional all the
    // way down, and "" would publish an empty favicon link instead of no favicon link.
    const clearSiteMetaAsset = useCallback(
        (key: 'faviconAssetId' | 'ogImageAssetId') => {
            const next = { ...siteMeta };
            delete next[key];
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
                                projectId={projectId}
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

                {/* Both are asset ids (S-3, S-4), so they behave like any other image slot
                    rather than inviting someone to type a uuid. */}
                <AssetSlot
                    label="Favicon"
                    assetId={siteMeta.faviconAssetId ?? null}
                    error={fieldErrors['site_meta.faviconAssetId']}
                    projectId={projectId}
                    kind="favicon"
                    onSet={(id) => editSiteMeta('faviconAssetId', id)}
                    onClear={() => clearSiteMetaAsset('faviconAssetId')}
                />
                <AssetSlot
                    label="Social share image"
                    assetId={siteMeta.ogImageAssetId ?? null}
                    error={fieldErrors['site_meta.ogImageAssetId']}
                    projectId={projectId}
                    kind="og_image"
                    onSet={(id) => editSiteMeta('ogImageAssetId', id)}
                    onClear={() => clearSiteMetaAsset('ogImageAssetId')}
                />
            </section>
        </div>
    );
}
