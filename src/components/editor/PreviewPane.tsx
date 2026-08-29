'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Image as ImageIcon, Monitor, RefreshCw, Smartphone, Trash2, X } from 'lucide-react';
import { useEditorStore } from '@/lib/editor-store';
import { assemblePreview, injectErrorHook } from '@/lib/preview';
import { PREVIEW_IFRAME_SANDBOX, withPreviewCsp } from '@/lib/preview-security';
import { friendlyPreviewIssue } from '@/lib/editor/preview-copy';
import { explainPreviewIssues } from '@/lib/editor/ai-fix';
import { previewDocumentUrl } from '@/lib/editor/preview-frame';
import { filesForPreview } from '@/lib/editor/preview-files';
import { sectionLabel } from '@/lib/editor/section-registry';
import { htmlPagesOf } from '@/lib/ai/generate/pages';
import { cn } from '@/lib/utils';
import { AskAiFixDialog } from './AskAiFixDialog';
import ImagePicker, { type PickedImage } from './ImagePicker';

const DEBOUNCE_MS = 120;

type Viewport = 'full' | 'phone';

interface SelectedImageState {
    src: string;
    alt: string;
    isBg: boolean;
    rect?: { top: number; left: number; width: number; height: number };
}

export default function PreviewPane() {
    const vfs = useEditorStore((s) => s.vfs);
    const projectId = useEditorStore((s) => s.projectId);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);
    const tree = useEditorStore((s) => s.tree);
    const pendingChange = useEditorStore((s) => s.pendingChange);
    const composition = useEditorStore((s) => s.composition);
    const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
    const selectSection = useEditorStore((s) => s.selectSection);
    const requestAiEdit = useEditorStore((s) => s.requestAiEdit);
    const chatBusy = useEditorStore((s) => s.chatBusy);

    const frame = useRef<HTMLIFrameElement>(null);
    const [viewport, setViewport] = useState<Viewport>('full');
    const [reloadTick, setReloadTick] = useState(0);
    const [entry, setEntry] = useState('index.html');
    const [preview, setPreview] = useState(() => {
        const r = assemblePreview(vfs.toMap(), 'index.html');
        return { doc: withPreviewCsp(injectErrorHook(r.html)), warnings: r.warnings };
    });
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [askOpen, setAskOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerKind, setPickerKind] = useState<'image' | 'background'>('image');
    const last = useRef(preview.doc);

    useEffect(() => {
        const t = setTimeout(() => {
            const map = filesForPreview(vfs.toMap(), pendingChange);
            const pages = htmlPagesOf(map);
            const current = pages.includes(entry) ? entry : (pages[0] ?? 'index.html');
            if (current !== entry) setEntry(current);
            const r = assemblePreview(map, current);
            const next = withPreviewCsp(injectErrorHook(r.html));
            if (next === last.current) return;
            last.current = next;
            setPreview({ doc: next, warnings: r.warnings });
            setRuntimeError(null);
            setAskOpen(false);
            setSelectedImage(null);
        }, DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [vfs, dirtyPaths, tree, pendingChange, reloadTick, entry]);

    const frameUrl = useMemo(() => previewDocumentUrl(preview.doc), [preview.doc]);

    useEffect(() => {
        return () => {
            if (frameUrl) URL.revokeObjectURL(frameUrl);
        };
    }, [frameUrl]);

    useEffect(() => {
        function onMessage(e: MessageEvent) {
            if (e.source !== frame.current?.contentWindow) return;
            const data = e.data as {
                __pagecraft?: boolean;
                message?: string;
                kind?: string;
                path?: string;
                src?: string;
                alt?: string;
                isBg?: boolean;
                rect?: { top: number; left: number; width: number; height: number };
            };
            if (!data?.__pagecraft) return;
            if (data.kind === 'navigate' && typeof data.path === 'string' && data.path.trim()) {
                last.current = '';
                setEntry(data.path.trim());
                return;
            }
            if (data.kind === 'image_click' && data.src) {
                setSelectedImage({
                    src: data.src,
                    alt: data.alt || '',
                    isBg: Boolean(data.isBg),
                    rect: data.rect,
                });
                return;
            }
            if (data.message) setRuntimeError(data.message);
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    async function handleDeleteImage() {
        if (!selectedImage) return;
        const isBg = selectedImage.isBg;
        const target = selectedImage;
        setSelectedImage(null);
        if (isBg) {
            await requestAiEdit('Remove the background photo from this section');
        } else {
            const desc = target.alt ? `the image "${target.alt}"` : 'the selected photo';
            await requestAiEdit(`Delete or remove ${desc}`);
        }
    }

    function handleEditImagePrompt() {
        if (!selectedImage) return;
        const desc = selectedImage.isBg ? 'the background photo' : (selectedImage.alt ? `the image "${selectedImage.alt}"` : 'this image');
        setSelectedImage(null);
        const composer = document.getElementById('chat-composer-input') as HTMLTextAreaElement | null;
        if (composer) {
            composer.value = `Change ${desc}: `;
            composer.focus();
        } else {
            void requestAiEdit(`Make ${desc} look more modern and visually appealing`);
        }
    }

    function openImagePicker(kind: 'image' | 'background') {
        setPickerKind(kind);
        setPickerOpen(true);
    }

    async function handleImagePicked(picked: PickedImage) {
        setPickerOpen(false);
        const target = selectedImage;
        setSelectedImage(null);
        if (pickerKind === 'background' || target?.isBg) {
            await requestAiEdit(`Change the background photo to ${picked.url}`);
        } else if (target) {
            const desc = target.alt ? `the image "${target.alt}"` : 'the selected image';
            await requestAiEdit(`Replace ${desc} with ${picked.url}`);
        } else {
            await requestAiEdit(`Use this image on the page: ${picked.url}`);
        }
    }

    const issues = [...preview.warnings, ...(runtimeError ? [runtimeError] : [])]
        .map(friendlyPreviewIssue);
    const uniqueIssues = [...new Set(issues)];
    const htmlPages = htmlPagesOf(vfs.toMap());
    const showNotice = uniqueIssues.length > 0;
    const empty = !preview.doc.trim();
    const sections = composition?.sections ?? [];
    const fix = explainPreviewIssues(uniqueIssues);

    return (
        <div id="editor-preview" className="flex h-full min-h-0 w-full flex-col">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-3">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Preview
                </span>
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        aria-label="Desktop"
                        aria-pressed={viewport === 'full'}
                        title="Desktop"
                        onClick={() => setViewport('full')}
                        className={cn(
                            'flex size-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            viewport === 'full'
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        <Monitor className="size-4" strokeWidth={1.75} />
                    </button>
                    <button
                        type="button"
                        aria-label="Phone"
                        aria-pressed={viewport === 'phone'}
                        title="Phone"
                        onClick={() => setViewport('phone')}
                        className={cn(
                            'flex size-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            viewport === 'phone'
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        <Smartphone className="size-4" strokeWidth={1.75} />
                    </button>
                    <button
                        type="button"
                        aria-label="Refresh preview"
                        title="Refresh"
                        onClick={() => {
                            last.current = '';
                            setReloadTick((n) => n + 1);
                        }}
                        className="flex size-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <RefreshCw className="size-4" strokeWidth={1.75} />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => openImagePicker('background')}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Change background photo"
                >
                    <ImageIcon className="size-3.5 text-primary" aria-hidden />
                    <span>Change background</span>
                </button>

                {htmlPages.length > 1 ? (
                    <label className="min-w-0">
                        <span className="sr-only">Page</span>
                        <select
                            value={htmlPages.includes(entry) ? entry : htmlPages[0]}
                            onChange={(e) => {
                                last.current = '';
                                setEntry(e.target.value);
                            }}
                            className="h-11 max-w-40 cursor-pointer truncate rounded-full border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {htmlPages.map((path) => (
                                <option key={path} value={path}>
                                    {path.replace(/\.html?$/i, '') || 'home'}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}
                {sections.length > 0 ? (
                    <label className="ml-auto min-w-0">
                        <span className="sr-only">Page section</span>
                        <select
                            value={selectedSectionId ?? ''}
                            onChange={(e) => selectSection(e.target.value)}
                            className="h-11 max-w-48 cursor-pointer truncate rounded-full border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {sections.map((section) => (
                                <option key={section.id} value={section.id}>
                                    {sectionLabel(section.type)}
                                    {section.locked ? ' (locked)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : (
                    <span className="ml-auto truncate text-xs text-muted-foreground">Homepage</span>
                )}
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden p-3">
                <div
                    className={
                        viewport === 'phone'
                            ? 'relative mx-auto h-full w-[min(100%,390px)] overflow-hidden rounded-xl border border-border bg-card shadow-lg'
                            : 'relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm'
                    }
                >
                    {empty || !frameUrl ? (
                        <div className="flex h-full items-center justify-center p-6">
                            <p className="max-w-xs text-center text-sm text-muted-foreground">
                                Your site will show up here as you edit.
                            </p>
                        </div>
                    ) : (
                        <iframe
                            key={reloadTick}
                            ref={frame}
                            title="Your site"
                            sandbox={PREVIEW_IFRAME_SANDBOX}
                            src={frameUrl}
                            className="pointer-events-auto absolute inset-0 z-0 h-full w-full border-0 bg-card"
                        />
                    )}

                    {/* Inline Image Action Toolbar on clicked image */}
                    {selectedImage && !chatBusy && (
                        <div
                            role="dialog"
                            aria-label="Image actions"
                            className="pointer-events-auto absolute inset-x-4 top-4 z-20 mx-auto flex max-w-md items-center justify-between gap-2 rounded-2xl border border-border/80 bg-card/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                        >
                            <div className="flex min-w-0 items-center gap-2 px-2">
                                <ImageIcon className="size-4 shrink-0 text-primary" aria-hidden />
                                <span className="truncate text-xs font-medium text-foreground">
                                    {selectedImage.isBg
                                        ? 'Background photo'
                                        : (selectedImage.alt || 'Selected image')}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => openImagePicker(selectedImage.isBg ? 'background' : 'image')}
                                    className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                                    title="Change image"
                                >
                                    <ImageIcon className="size-3" aria-hidden />
                                    <span>Change</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEditImagePrompt}
                                    className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent"
                                    title="Edit image"
                                >
                                    <Edit3 className="size-3" aria-hidden />
                                    <span>Edit</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleDeleteImage()}
                                    className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                                    title="Delete image"
                                >
                                    <Trash2 className="size-3" aria-hidden />
                                    <span>Delete</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedImage(null)}
                                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                                    aria-label="Close"
                                >
                                    <X className="size-3.5" aria-hidden />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {showNotice && !empty && (
                    <div
                        role="status"
                        className="pointer-events-auto absolute inset-x-6 bottom-6 z-10 rounded-2xl border border-border/70 bg-card/95 px-4 py-3 text-sm shadow-md backdrop-blur"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-medium text-foreground">{fix.title}</p>
                                <p className="mt-1 text-muted-foreground">{fix.what}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAskOpen(true)}
                                className="h-11 shrink-0 cursor-pointer rounded-full border border-gold bg-gold px-4 text-xs font-semibold text-gold-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                            >
                                Fix with AI
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <AskAiFixDialog
                open={askOpen}
                title={fix.title}
                what={fix.what}
                busy={chatBusy}
                onDismiss={() => setAskOpen(false)}
                onConfirm={() => {
                    setAskOpen(false);
                    void requestAiEdit(fix.instruction);
                }}
            />

            {/* Image Picker for replacing images or background photos */}
            <ImagePicker
                open={pickerOpen}
                projectId={projectId}
                kind="image"
                title={pickerKind === 'background' ? 'Choose background photo' : 'Choose a photo'}
                onClose={() => setPickerOpen(false)}
                onPicked={(picked) => void handleImagePicked(picked)}
            />
        </div>
    );
}

