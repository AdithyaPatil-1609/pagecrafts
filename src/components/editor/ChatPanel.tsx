'use client';
import { FormEvent, useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { sectionLabel } from '@/lib/editor/section-registry';
import ChangeSummary from './ChangeSummary';

export default function ChatPanel() {
    const composition = useEditorStore((s) => s.composition);
    const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
    const selectSection = useEditorStore((s) => s.selectSection);
    const requestAiEdit = useEditorStore((s) => s.requestAiEdit);
    const messages = useEditorStore((s) => s.chatMessages);
    const busy = useEditorStore((s) => s.chatBusy);
    const error = useEditorStore((s) => s.chatError);
    const progress = useEditorStore((s) => s.chatProgress);
    const pendingChange = useEditorStore((s) => s.pendingChange);
    const hasSections = (composition?.sections.length ?? 0) > 0;

    const [draft, setDraft] = useState('');

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        const text = draft.trim();
        if (!text || busy) return;
        setDraft('');
        await requestAiEdit(text);
    }

    return (
        <section aria-label="Ask for a change" className="flex h-full min-h-0 flex-col">
            <header className="shrink-0 border-b border-border px-3 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ask
                </h2>
            </header>

            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
                {messages.length === 0 && !busy ? (
                    <p className="text-xs text-muted-foreground">
                        {hasSections
                            ? 'Describe a change to the selected section, or ask for a whole new website. Nothing is applied until you keep it.'
                            : 'Describe the website you want. Nothing is applied until you keep it.'}
                    </p>
                ) : (
                    <ol className="space-y-3">
                        {messages.map((turn, index) => (
                            <li key={`${turn.role}-${index}`} className="text-sm">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                    {turn.role === 'user' ? 'You' : 'Suggestion'}
                                </p>
                                <p className="mt-0.5 text-foreground">{turn.text}</p>
                            </li>
                        ))}
                    </ol>
                )}
                {busy && (
                    <p role="status" className="mt-3 text-xs text-muted-foreground">
                        {progress || 'Preparing a suggestion…'}
                    </p>
                )}
                {error && (
                    <p role="alert" className="mt-3 text-xs text-destructive">
                        {error}
                    </p>
                )}
            </div>

            <form onSubmit={onSubmit} className="shrink-0 border-t border-border p-3">
                {hasSections ? (
                    <label className="mb-2 block text-xs text-muted-foreground">
                        Section
                        <select
                            value={selectedSectionId ?? ''}
                            onChange={(e) => selectSection(e.target.value)}
                            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                        >
                            {composition?.sections.map((section) => (
                                <option key={section.id} value={section.id}>
                                    {sectionLabel(section.type)}
                                    {section.locked ? ' (locked)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={500}
                    rows={3}
                    disabled={busy || !!pendingChange}
                    placeholder="Create a sweet shop website"
                    aria-label="Change request"
                    className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
                <div className="mt-2 flex items-center justify-end">
                    <button
                        type="submit"
                        disabled={busy || !!pendingChange || !draft.trim()}
                        className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-40"
                    >
                        {busy ? 'Sending…' : 'Send'}
                    </button>
                </div>
            </form>

            <ChangeSummary />
        </section>
    );
}
