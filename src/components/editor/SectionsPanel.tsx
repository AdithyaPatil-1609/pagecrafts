'use client';
import { useEditorStore } from '@/lib/editor-store';
import { variantsFor } from '@/lib/ai/sections/contracts';
import { sectionLabel } from '@/lib/editor/section-registry';
import { LOOK_DIALS } from '@/lib/editor/look';
import type { ArtDirection } from '@/lib/contracts';

export default function SectionsPanel() {
    const composition = useEditorStore((s) => s.composition);
    const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
    const selectSection = useEditorStore((s) => s.selectSection);
    const moveSectionUp = useEditorStore((s) => s.moveSectionUp);
    const moveSectionDown = useEditorStore((s) => s.moveSectionDown);
    const toggleSectionVisible = useEditorStore((s) => s.toggleSectionVisible);
    const toggleSectionLocked = useEditorStore((s) => s.toggleSectionLocked);
    const setSectionVariant = useEditorStore((s) => s.setSectionVariant);
    const restyleComposition = useEditorStore((s) => s.restyleComposition);

    if (!composition) return null;

    const look = composition.artDirection;

    return (
        <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-border px-3 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sections
                </h2>
            </div>

            <div className="shrink-0 space-y-2 border-b border-border px-3 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Look
                </h3>
                {LOOK_DIALS.map((dial) => (
                    <label key={dial.key} className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground">{dial.label}</span>
                        <select
                            value={look[dial.key]}
                            onChange={(e) =>
                                restyleComposition({ [dial.key]: e.target.value } as Partial<ArtDirection>)
                            }
                            aria-label={dial.label}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                            {dial.options.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                ))}
            </div>

            {composition.sections.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">
                    No sections on this page yet.
                </p>
            ) : (
                <ul className="flex flex-1 flex-col divide-y divide-border overflow-auto">
                    {composition.sections.map((section, index) => {
                        const selected = section.id === selectedSectionId;
                        const options = variantsFor(section.type);
                        const variants = options.includes(section.variant)
                            ? options
                            : [section.variant, ...options];
                        return (
                            <li
                                key={section.id}
                                className={`flex flex-col gap-2 px-3 py-2.5 ${selected ? 'bg-muted/50' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => selectSection(section.id)}
                                        aria-pressed={selected}
                                        className="truncate text-left text-sm font-medium text-foreground"
                                    >
                                        {sectionLabel(section.type)}
                                    </button>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            onClick={() => moveSectionUp(section.id)}
                                            disabled={index === 0}
                                            aria-label="Move up"
                                            className="rounded px-1.5 py-0.5 text-xs hover:bg-muted disabled:opacity-30"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => moveSectionDown(section.id)}
                                            disabled={index === composition.sections.length - 1}
                                            aria-label="Move down"
                                            className="rounded px-1.5 py-0.5 text-xs hover:bg-muted disabled:opacity-30"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => toggleSectionVisible(section.id)}
                                        className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted"
                                    >
                                        {section.visible ? 'Visible' : 'Hidden'}
                                    </button>
                                    <button
                                        onClick={() => toggleSectionLocked(section.id)}
                                        className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted"
                                    >
                                        {section.locked ? 'Locked' : 'Unlocked'}
                                    </button>
                                </div>

                                <select
                                    value={section.variant}
                                    onChange={(e) => setSectionVariant(section.id, e.target.value)}
                                    aria-label={`Layout for ${sectionLabel(section.type)}`}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                                >
                                    {variants.map((variant) => (
                                        <option key={variant} value={variant}>
                                            {variant}
                                        </option>
                                    ))}
                                </select>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
