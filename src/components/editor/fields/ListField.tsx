'use client';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import type { Field } from '@/lib/contracts';
import type { ListItem } from '@/lib/content/slots';
import TextField from './TextField';
import RichTextField from './RichTextField';
import ColorField from './ColorField';
import SelectField from './SelectField';

// FieldType "list" — the repeatable one: menu items, services, opening hours.
//
// Add, remove and reorder are the whole feature, and each of them rewrites the list in the
// page as a block, so the numbering in the markup can never drift from the order on screen.
// Lists do not nest (see the conventions doc), which is why an item's fields go straight to
// the scalar controls rather than back through the dispatcher.

export interface ListFieldProps {
    path: string;
    field: Field;
    items: ListItem[];
    issue?: string | null;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onItemChange: (index: number, key: string, value: unknown) => void;
}

function itemLabel(field: Field, item: ListItem, index: number): string {
    const first = field.itemSchema?.[0];
    const value = first ? String(item[first.key] ?? '').trim() : '';
    return value || `Item ${index + 1}`;
}

export default function ListField({
    path,
    field,
    items,
    issue,
    onAdd,
    onRemove,
    onMove,
    onItemChange,
}: ListFieldProps) {
    const itemSchema = field.itemSchema ?? [];

    return (
        <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground">{field.label}</legend>

            {items.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Nothing here yet. Add the first one.
                </p>
            )}

            <ul className="space-y-2">
                {items.map((item, index) => (
                    <li key={index} className="rounded-md border border-border bg-card p-2.5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium text-muted-foreground">
                                {itemLabel(field, item, index)}
                            </span>

                            <div className="flex shrink-0 items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => onMove(index, 'up')}
                                    disabled={index === 0}
                                    aria-label={`Move ${itemLabel(field, item, index)} up`}
                                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                                >
                                    <ChevronUp aria-hidden className="size-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onMove(index, 'down')}
                                    disabled={index === items.length - 1}
                                    aria-label={`Move ${itemLabel(field, item, index)} down`}
                                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                                >
                                    <ChevronDown aria-hidden className="size-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onRemove(index)}
                                    aria-label={`Remove ${itemLabel(field, item, index)}`}
                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                >
                                    <Trash2 aria-hidden className="size-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            {itemSchema.map((itemField) => {
                                const id = `${path}-${index}-${itemField.key}`;
                                const value = String(item[itemField.key] ?? '');
                                const change = (next: unknown) =>
                                    onItemChange(index, itemField.key, next);

                                if (itemField.type === 'richtext') {
                                    return (
                                        <RichTextField
                                            key={itemField.key}
                                            id={id}
                                            label={itemField.label}
                                            value={value}
                                            onChange={change}
                                        />
                                    );
                                }
                                if (itemField.type === 'color') {
                                    return (
                                        <ColorField
                                            key={itemField.key}
                                            id={id}
                                            label={itemField.label}
                                            value={value}
                                            onChange={change}
                                        />
                                    );
                                }
                                if (itemField.type === 'select') {
                                    return (
                                        <SelectField
                                            key={itemField.key}
                                            id={id}
                                            label={itemField.label}
                                            value={value}
                                            options={itemField.options ?? []}
                                            onChange={change}
                                        />
                                    );
                                }
                                return (
                                    <TextField
                                        key={itemField.key}
                                        id={id}
                                        label={itemField.label}
                                        value={value}
                                        maxLength={itemField.maxLength}
                                        onChange={change}
                                    />
                                );
                            })}
                        </div>
                    </li>
                ))}
            </ul>

            {issue && (
                <p role="alert" className="text-xs text-destructive">
                    {issue}
                </p>
            )}

            <button
                type="button"
                onClick={onAdd}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
                <Plus aria-hidden className="size-3.5" />
                Add {field.label.replace(/s$/i, '').toLowerCase()}
            </button>
        </fieldset>
    );
}
