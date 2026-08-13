'use client';
import { useEditorStore } from '@/lib/editor-store';
import { variantsFor } from '@/lib/ai/sections/contracts';

export default function SectionsPanel() {
    const composition = useEditorStore((s) => s.composition);
    const moveSectionUp = useEditorStore((s) => s.moveSectionUp);
    const moveSectionDown = useEditorStore((s) => s.moveSectionDown);
    const toggleSectionVisible = useEditorStore((s) => s.toggleSectionVisible);
    const toggleSectionLocked = useEditorStore((s) => s.toggleSectionLocked);
    const setSectionVariant = useEditorStore((s) => s.setSectionVariant);

    if (!composition) return null;

    return (
        <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-border px-3 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sections
                </h2>
            </div>

            <ul className="flex flex-1 flex-col divide-y divide-border overflow-auto">
                {composition.sections.map((section, index) => (
                    <li key={section.id} className="flex flex-col gap-2 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                                {section.type}
                            </span>
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
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                            {variantsFor(section.type).map((variant) => (
                                <option key={variant} value={variant}>
                                    {variant}
                                </option>
                            ))}
                        </select>
                    </li>
                ))}
            </ul>
        </div>
    );
}