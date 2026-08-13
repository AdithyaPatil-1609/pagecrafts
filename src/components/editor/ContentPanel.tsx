'use client';
import { useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

import { useEditorStore } from '@/lib/editor-store';
import type { ContentSection, Field } from '@/lib/contracts';
import { boundSlotPaths, type ListItem } from '@/lib/content/slots';
import { addPhotoCredit, toCredit } from '@/lib/content/credits';
import ImagePicker, { type PickedImage } from './ImagePicker';
import SiteSettings from './SiteSettings';
import TextField from './fields/TextField';
import RichTextField from './fields/RichTextField';
import ColorField from './fields/ColorField';
import SelectField from './fields/SelectField';
import ImageField from './fields/ImageField';
import ListField from './fields/ListField';

// Screen 07 — the guided editing surface, and the only one most people will ever use.
//
// Every control on it is drawn from the project's `content_schema` and from nothing else
// (C-07). There is no template identifier anywhere in this file: adding a design, or adding
// a section to one, needs no change here. A new FieldType is the one thing that does — and
// that is a new file under ./fields, not a special case in this one.

function fieldId(sectionKey: string, fieldKey: string): string {
    return `content-${sectionKey}-${fieldKey}`;
}

function SyncStatus() {
    const syncing = useEditorStore((s) => s.contentSyncing);
    const error = useEditorStore((s) => s.contentError);

    if (error) {
        return (
            <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
                <span>
                    {error} Your page still shows the change — it just has not reached the
                    server yet.
                </span>
            </p>
        );
    }

    return (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {syncing ? (
                <>
                    <Loader2 aria-hidden className="size-3 animate-spin" />
                    Saving your words…
                </>
            ) : (
                <>
                    <Check aria-hidden className="size-3" />
                    Everything here is saved
                </>
            )}
        </p>
    );
}

export default function ContentPanel() {
    const schema = useEditorStore((s) => s.contentSchema);
    const content = useEditorStore((s) => s.content);
    const issues = useEditorStore((s) => s.contentIssues);
    const projectId = useEditorStore((s) => s.projectId);
    const vfs = useEditorStore((s) => s.vfs);
    const setContentValue = useEditorStore((s) => s.setContentValue);
    const setListItemValue = useEditorStore((s) => s.setListItemValue);
    const addListItem = useEditorStore((s) => s.addListItem);
    const removeListItem = useEditorStore((s) => s.removeListItem);
    const moveListItem = useEditorStore((s) => s.moveListItem);
    const toggleAdvanced = useEditorStore((s) => s.toggleAdvanced);

    // Which image slot the library was opened for. Null means it is closed.
    const [pickingFor, setPickingFor] = useState<string | null>(null);
    const tree = useEditorStore((s) => s.tree);

    // Fields this design has nowhere to put. Editing one would change the stored content and
    // move nothing on the page, so the panel says that rather than looking broken. The VFS
    // mutates in place, so `tree` is the store's signal that the markup moved.
    const bound = useMemo(() => {
        void tree;
        const entry = vfs.paths().find((p) => /\.html?$/i.test(p));
        const html = entry ? vfs.read(entry) : null;
        return schema && html !== null ? boundSlotPaths(html, schema) : null;
    }, [vfs, tree, schema]);

    if (!schema) {
        return (
            <div className="space-y-3 p-6">
                <h2 className="text-sm font-semibold text-foreground">Guided editing</h2>
                <p className="text-sm text-muted-foreground">
                    This site was not made from one of our designs, so there is no guided panel
                    for it yet. You can still edit it directly.
                </p>
                <button
                    onClick={toggleAdvanced}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    Open the files
                </button>
            </div>
        );
    }

    function onPicked(path: string, picked: PickedImage) {
        setContentValue(path, picked.url);

        // Attribution is ours to write, not the owner's to remember (S-1).
        const credit = toCredit(picked.attribution);
        if (!credit) return;

        const entry = vfs.paths().find((p) => /\.html?$/i.test(p));
        const html = entry ? vfs.read(entry) : null;
        if (!entry || html === null) return;

        const next = addPhotoCredit(html, credit);
        if (next !== html) vfs.write(entry, next);
    }

    function renderField(section: ContentSection, field: Field) {
        const path = `${section.key}.${field.key}`;
        const id = fieldId(section.key, field.key);
        const issue = issues[path] ?? null;
        const raw = content[section.key]?.[field.key];

        switch (field.type) {
            case 'richtext':
                return (
                    <RichTextField
                        key={field.key}
                        id={id}
                        label={field.label}
                        value={String(raw ?? '')}
                        issue={issue}
                        onChange={(value) => setContentValue(path, value)}
                    />
                );

            case 'color':
                return (
                    <ColorField
                        key={field.key}
                        id={id}
                        label={field.label}
                        value={String(raw ?? '')}
                        issue={issue}
                        onChange={(value) => setContentValue(path, value)}
                    />
                );

            case 'select':
                return (
                    <SelectField
                        key={field.key}
                        id={id}
                        label={field.label}
                        value={String(raw ?? '')}
                        options={field.options ?? []}
                        issue={issue}
                        onChange={(value) => setContentValue(path, value)}
                    />
                );

            case 'image':
                return (
                    <ImageField
                        key={field.key}
                        id={id}
                        label={field.label}
                        value={typeof raw === 'string' && raw ? raw : null}
                        issue={issue}
                        onOpenLibrary={() => setPickingFor(path)}
                        onClear={() => setContentValue(path, '')}
                    />
                );

            case 'list':
                return (
                    <ListField
                        key={field.key}
                        path={path}
                        field={field}
                        items={Array.isArray(raw) ? (raw as ListItem[]) : []}
                        issue={issue}
                        onAdd={() => addListItem(path)}
                        onRemove={(index) => removeListItem(path, index)}
                        onMove={(index, direction) => moveListItem(path, index, direction)}
                        onItemChange={(index, key, value) =>
                            setListItemValue(path, index, key, value)
                        }
                    />
                );

            default:
                return (
                    <TextField
                        key={field.key}
                        id={id}
                        label={field.label}
                        value={String(raw ?? '')}
                        maxLength={field.maxLength}
                        issue={issue}
                        onChange={(value) => setContentValue(path, value)}
                    />
                );
        }
    }

    return (
        <div className="flex h-full flex-col">
            <header className="shrink-0 space-y-1 border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Your content</h2>
                <SyncStatus />
            </header>

            <div className="min-h-0 flex-1 space-y-6 overflow-auto p-4">
                {schema.sections.map((section) => (
                    <section key={section.key} className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {section.label}
                        </h3>
                        <div className="space-y-3.5">
                            {section.fields.map((field) => {
                                const path = `${section.key}.${field.key}`;
                                const unbound = bound !== null && !bound.has(path);

                                return (
                                    <div key={field.key} className={unbound ? 'opacity-60' : undefined}>
                                        {renderField(section, field)}
                                        {unbound && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                This design has no place to show this yet, so
                                                changing it will not alter the page.
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}

                <SiteSettings />
            </div>

            <ImagePicker
                open={pickingFor !== null}
                projectId={projectId}
                onClose={() => setPickingFor(null)}
                onPicked={(picked) => {
                    if (pickingFor) onPicked(pickingFor, picked);
                }}
            />
        </div>
    );
}
