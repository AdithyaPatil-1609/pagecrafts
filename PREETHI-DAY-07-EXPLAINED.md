# PageCraft Editor — Day 7, Every File Explained

Day 7 · Frontend / Editor (R1) · Preethi · all paths are from the repo root

---

## What Day 7 is, in one sentence

The timeline grid says:

> **D7 · Preethi · Frontend / Editor** — Autosave loop + explicit save points.

In plain words: **stop making people remember to press Save.**

Day 6 built real saving, but you still had to click the button (or hit Ctrl/Cmd+S) every single time. That's fine for an engineer. It is not fine for a normal user, who will type for two minutes, get distracted, and lose those two minutes. Today the editor starts saving itself.

---

## Where things stood at the end of Day 6

- Typing changes a file in memory and marks it dirty. Nothing leaves the browser until you press Save.
- Pressing Save sends every file to the server. Success clears the dots; failure keeps them lit and shows a plain-English reason.
- Closing the tab with unsaved work asks you to confirm first.

The gap: **saving is 100% manual.** If you never press the button, nothing is ever written to the database, no matter how long you type.

---

## What must be true when Day 7 ends

1. Stop typing for a moment (about a second and a half) and the editor saves by itself — no click needed.
2. While you're actively typing, it does **not** save on every keystroke. That would hammer the server and fight with what you're typing.
3. Certain actions save **immediately**, without waiting for that pause — these are the "explicit save points": switching to a different file, leaving Advanced mode, and creating, renaming or deleting a file. Structural changes are too important to sit in a queue.
4. Pressing Save (or Ctrl/Cmd+S) still works exactly as before, and now also cancels any pending automatic save, so you never get two overlapping saves.
5. Leaving the editor entirely (closing the tab, or switching to a different project) never leaves a save silently hanging in the background for a project you've already left.

---

## The shape of Day 7, in one picture

```
You type a letter
│
├── src/lib/debounce.ts .............. NEW
│      a small stopwatch: "wait, then do this — unless
│      something else happens first, then restart the wait"
│
├── src/lib/editor-store.ts .......... CHANGED
│      owns the stopwatch, decides when to wait and
│      when to save right now instead
│
├── src/components/editor/EditorShell.tsx . CHANGED (small)
│      makes sure leaving the editor flushes anything pending
│
└── tests/unit/
    ├── debounce.test.ts ............. NEW
    └── autosave.test.ts ............. NEW
```

**The rule that shapes all of it:** typing schedules a save; almost everything else forces one immediately. A pause in typing is a guess that you're done with a thought. A file switch, a rename, a delete — those are certainties. Certainties don't wait.

---

## The workflow — what happens between two keystrokes and a save

1. You type a character in the code editor.
2. The store writes it into the file box (VFS) — exactly like Day 6.
3. The store also tells the stopwatch: "something changed, save in 1.5 seconds — unless I tell you otherwise before then."
4. You type another character half a second later. The stopwatch **restarts** at 1.5 seconds from now. It never fires while you're mid-thought.
5. You stop typing. 1.5 seconds pass with nothing resetting the clock. The stopwatch fires, and it calls the exact same `saveProject` that Day 6's Save button calls.
6. The save behaves exactly as Day 6 described: send everything, mark clean only on success, show a plain message on failure.

Now the other path — an explicit save point:

1. You're editing `index.html`, mid-sentence, and you click `styles.css` in the file tree to switch to it.
2. Before the switch happens, the store tells the stopwatch: "never mind the wait — save right now."
3. `index.html`'s edit is sent to the server immediately, and only then does the screen switch to `styles.css`.

This matters because without it, switching files right after typing would leave that last thought sitting in memory, waiting out a 1.5-second clock that the user has no way of seeing.

---

# Files to create

---

## 1 · `src/lib/debounce.ts`

**Why it exists.** "Wait a bit, then act, but restart the wait if this happens again" is a common need — search boxes do it, resize handlers do it, and now autosave does it. Rather than writing that timing logic inside the store where it would be easy to get wrong, it lives in one small, plain file that can be tested on its own.

**What the code does as a whole.** It hands back three controls for a single scheduled action: `trigger()` — "run this soon, and restart the clock if called again before it fires"; `flush()` — "forget the clock, run it right now"; and `cancel()` — "forget it entirely, don't run it at all."

```ts
export interface DebouncedTrigger {
    trigger(): void;
    flush(): void;
    cancel(): void;
}

export function debounceTrigger(fn: () => void, delayMs: number): DebouncedTrigger {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function clear() {
        if (timer) clearTimeout(timer);
        timer = null;
    }

    return {
        trigger() {
            clear();
            timer = setTimeout(fn, delayMs);
        },
        flush() {
            clear();
            fn();
        },
        cancel: clear,
    };
}
```

**Why `flush()` and `cancel()` are both needed, and are different.** `flush()` means "the wait is over, act now" — used when you switch files. `cancel()` means "don't act at all" — used when you leave a project entirely, so a stale save for a project you've already closed can never fire.

**Impact on the website.** None by itself — it's a plain timing tool with no opinion about saving. Its impact shows up wherever it's used, which today is exactly one place.

---

## 2 · `tests/unit/debounce.test.ts`

**Why it exists.** Timing bugs are the easiest kind to ship by accident and the hardest to spot by eye — "did it fire once or twice?" is not something a code review catches. Vitest can fast-forward fake time, so these can be checked precisely.

**What the code does as a whole.** It checks the three behaviours the whole feature depends on: a single `trigger()` fires once after the delay; typing repeatedly (calling `trigger()` again before it fires) restarts the clock and still only fires once; and `flush()`/`cancel()` do exactly what their names promise.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounceTrigger } from '@/lib/debounce';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('debounceTrigger', () => {
    it('runs once, after the delay', () => {
        const fn = vi.fn();
        const d = debounceTrigger(fn, 1000);

        d.trigger();
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('restarts the wait on every call, so rapid typing only saves once', () => {
        const fn = vi.fn();
        const d = debounceTrigger(fn, 1000);

        d.trigger();
        vi.advanceTimersByTime(700);
        d.trigger();
        vi.advanceTimersByTime(700);
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('flush runs immediately and cancels the pending wait', () => {
        const fn = vi.fn();
        const d = debounceTrigger(fn, 1000);

        d.trigger();
        d.flush();
        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('cancel means it never runs at all', () => {
        const fn = vi.fn();
        const d = debounceTrigger(fn, 1000);

        d.trigger();
        d.cancel();
        vi.advanceTimersByTime(5000);

        expect(fn).not.toHaveBeenCalled();
    });
});
```

**Impact on the website.** None directly — it's what lets everyone trust that "1.5 seconds after you stop typing" really means that, and not "sometimes twice" or "sometimes never."

---

## 3 · `tests/unit/autosave.test.ts`

**Why it exists.** The store is where autosave and explicit save points actually meet real behaviour — this proves the wiring, not just the timer.

**What the code does as a whole.** With fake time and a fake `fetch`, it checks: typing schedules a save that fires after the pause; typing again before the pause resets it; and switching files forces an immediate save instead of waiting.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor-store';

function okReply(body: unknown) {
    return vi.fn().mockResolvedValue({ json: async () => body } as Response);
}

beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.getState().vfs.reset();
    useEditorStore.getState().vfs.seed({ 'index.html': 'hello', 'styles.css': 'body {}' });
    useEditorStore.setState({
        projectId: 'p1',
        activeFile: 'index.html',
        saving: false,
        saveError: null,
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('autosave', () => {
    it('saves on its own after a pause in typing', async () => {
        const fetchMock = okReply({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        useEditorStore.getState().writeActive('hello world');
        expect(fetchMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1500);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not save mid-typing', async () => {
        const fetchMock = okReply({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        useEditorStore.getState().writeActive('h');
        await vi.advanceTimersByTimeAsync(1000);
        useEditorStore.getState().writeActive('he');
        await vi.advanceTimersByTimeAsync(1000);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('switching files saves immediately, without waiting', async () => {
        const fetchMock = okReply({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        useEditorStore.getState().writeActive('hello world');
        useEditorStore.getState().openFile('styles.css');

        await vi.advanceTimersByTimeAsync(0);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
```

**Impact on the website.** None directly. It's the proof that "autosave" and "explicit save point" are not just claims in a document — they're checked, repeatable behaviour.

---

# Files to change, rather than create

---

## 4 · `src/lib/editor-store.ts` (changed)

**Why it changes.** This is where the stopwatch from `debounce.ts` gets connected to real saving, and where every explicit save point gets its `flush()` call.

**What the code does as a whole.** One autosave clock is created for the whole editor. Typing (`writeActive`) restarts that clock. Switching files, leaving Advanced mode, and any structural change (create, rename, delete) force it to fire immediately instead of waiting. Loading a new project cancels any leftover clock from the project you just left, so nothing saves to the wrong place. A new `flushPendingSave` action is added so the screen itself (not just other store actions) can force a save — used when you leave the editor entirely.

```ts
'use client';
import { create } from 'zustand';
import { VFS } from '@/lib/vfs';
import { validatePath, type PathError } from '@/lib/paths';
import { loadProjectFiles, saveProjectFiles, pickEntryFile } from '@/lib/project-source';
import { debounceTrigger } from '@/lib/debounce';
import type { TreeNode } from '@/lib/contracts';

const vfs = new VFS();
const AUTOSAVE_DELAY_MS = 1500;

interface EditorState {
    vfs: VFS;
    projectId: string | null;
    tree: TreeNode | null;
    activeFile: string | null;
    dirtyPaths: string[];
    advanced: boolean;
    loading: boolean;
    loadError: string | null;
    saving: boolean;
    saveError: string | null;
    lastSavedAt: string | null;
    loadProject: (projectId: string) => Promise<void>;
    openFile: (path: string) => void;
    writeActive: (content: string) => void;
    toggleAdvanced: () => void;
    refresh: () => void;
    createFile: (path: string) => PathError | null;
    renameFile: (from: string, to: string) => PathError | null;
    deleteFile: (path: string) => void;
    saveProject: () => Promise<void>;
    flushPendingSave: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    vfs,
    projectId: null,
    tree: vfs.list(),
    activeFile: null,
    dirtyPaths: [],
    advanced: false,
    loading: true,
    loadError: null,
    saving: false,
    saveError: null,
    lastSavedAt: null,

    loadProject: async (projectId) => {
        autosave.cancel();
        set({ loading: true, loadError: null, saveError: null, projectId });

        const { files, updatedAt, error } = await loadProjectFiles(projectId);

        if (error) {
            set({ loading: false, loadError: error });
            return;
        }

        const { vfs } = get();
        vfs.reset();
        vfs.seed(files);

        set({
            activeFile: pickEntryFile(vfs.paths()),
            lastSavedAt: updatedAt,
            loading: false,
        });
    },

    openFile: (path) => {
        autosave.flush();
        set({ activeFile: path });
    },

    writeActive: (content) => {
        const { vfs, activeFile } = get();
        if (activeFile) vfs.write(activeFile, content);
        autosave.trigger();
    },

    toggleAdvanced: () => {
        autosave.flush();
        set((s) => ({ advanced: !s.advanced }));
    },

    refresh: () => set({ tree: vfs.list(), dirtyPaths: vfs.dirtyPaths() }),

    createFile: (path) => {
        const { vfs } = get();
        const err = validatePath(path, vfs.paths());
        if (err) return err;
        const clean = path.trim();
        vfs.write(clean, '');
        set({ activeFile: clean });
        autosave.flush();
        return null;
    },

    renameFile: (from, to) => {
        const { vfs, activeFile } = get();
        const err = validatePath(to, vfs.paths().filter((p) => p !== from));
        if (err) return err;
        const clean = to.trim();
        vfs.rename(from, clean);
        if (activeFile === from) set({ activeFile: clean });
        autosave.flush();
        return null;
    },

    deleteFile: (path) => {
        const { vfs, activeFile } = get();
        vfs.delete(path);
        if (activeFile === path) set({ activeFile: vfs.paths()[0] ?? null });
        autosave.flush();
    },

    saveProject: async () => {
        const { vfs, projectId, saving, dirtyPaths } = get();

        if (saving || !projectId || dirtyPaths.length === 0) return;

        set({ saving: true, saveError: null });

        const { updatedAt, error } = await saveProjectFiles(projectId, vfs.toMap());

        if (error) {
            set({ saving: false, saveError: error });
            return;
        }

        vfs.markClean();
        set({ saving: false, lastSavedAt: updatedAt });
    },

    flushPendingSave: () => autosave.flush(),
}));

const autosave = debounceTrigger(() => {
    useEditorStore.getState().saveProject();
}, AUTOSAVE_DELAY_MS);

vfs.subscribe(() => useEditorStore.getState().refresh());
```

**Why `saveProject` itself doesn't need to change.** It already refuses to run twice at once (`if (saving) return;`) and already refuses to run with nothing to save (`dirtyPaths.length === 0`). Autosave calling it and the Save button calling it are the exact same safe function — no special "autosave version" was needed.

**Why `loadProject` calls `autosave.cancel()` first.** Picture this without it: you're on project A, you type something, and before the 1.5-second clock fires you navigate to project B. Without cancelling, that old clock would still go off — and save project A's leftover edit correctly, but to the *wrong moment*, confusingly, after you've already moved on. Cancelling on load closes that door.

---

## 5 · `src/components/editor/EditorShell.tsx` (small change)

**Why it changes.** One more explicit save point: leaving the editor screen entirely — for example, clicking a dashboard link elsewhere in the app. That's an in-app page change, not a tab close, so Day 6's "are you sure you want to leave" browser warning never sees it. This is a place `flushPendingSave` earns its keep.

**What the code does as a whole.** When the editor is about to unmount, or the `projectId` changes to a different project, it forces any pending autosave to run first.

```tsx
'use client';
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import TopBar from './TopBar';
import ContentPanel from './ContentPanel';
import PreviewPane from './PreviewPane';
import FileTree from './FileTree';
import CodePane from './CodePane';
import { TreeSkeleton, PaneSkeleton } from './Skeletons';

export default function EditorShell({ projectId }: { projectId: string }) {
    useUnsavedGuard();
    const advanced = useEditorStore((s) => s.advanced);
    const loading = useEditorStore((s) => s.loading);
    const loadError = useEditorStore((s) => s.loadError);
    const loadProject = useEditorStore((s) => s.loadProject);
    const saveProject = useEditorStore((s) => s.saveProject);
    const flushPendingSave = useEditorStore((s) => s.flushPendingSave);

    useEffect(() => {
        loadProject(projectId);
        return () => flushPendingSave();
    }, [projectId, loadProject, flushPendingSave]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveProject();
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [saveProject]);

    // …the rest of Day 1–6's shell is unchanged
}
```

**Only two lines are new:** the `flushPendingSave` line pulled from the store, and `return () => flushPendingSave();` added to the existing load effect. Everything else in the file — the loading/error states, the Advanced/simple layout split — stays exactly as Day 1–6 left it.

---

# Files not touched today

**`src/components/editor/TopBar.tsx`** — no change. It already shows "Saving…", "All changes saved", the error text, and the unsaved count from Day 6. Autosave doesn't need new UI states; it just makes those existing states appear without a click.

**`src/lib/project-source.ts`, `src/lib/api/client.ts`, `src/lib/api/messages.ts`** — untouched. Autosave reuses the exact same save path Day 6 built. That reuse is the whole point of keeping "one door to the server."

---

# How my Day 7 affects everyone else

| Person | Their column | What changes for them today |
|---|---|---|
| **Adhyay** | Backend + Publish | His files `PUT` endpoint now receives far more requests than before — every pause in typing, not just every click of Save. Worth a quick check with him on whether the endpoint (or Adithya's rate limiting) is comfortable with that new frequency |
| **Adithya** | Platform + Database | His D7 task, daily spend caps, is for AI routes specifically — saving files is not an AI call, so autosave does not touch that budget. But if a rate limit is ever added to the files route itself, the 1.5-second pause keeps normal typing well under almost any reasonable limit |
| **Pragna** | Discovery + Templates | Her D7 work (filter chips, vertical search) doesn't touch the editor. Once her D8 content panel is wired up, it will call `writeActive` exactly like the code editor does — so it gets autosave for free, no extra work on her side |
| **Hanish** | AI | His D8 scoped-edit endpoint will hand back a proposed change. When that change is accepted, it should count as a normal edit — which means it can flow through `writeActive` and autosave will pick it up like anything else typed by hand |
| **You (D9 onwards)** | — | The commit history (D9 Adhyay, D14 me) needs "meaningful moments" to record, not one entry per keystroke. Autosave's every-1.5-seconds save is too frequent to double as a version point — that's exactly why the timeline keeps "save points" separate from "commits." Worth remembering when D9 arrives |

---

# What still isn't real after Day 7

| Thing | Status | Notes |
|---|---|---|
| **Two tabs on the same project** | Still last-write-wins, silently | Autosave makes this more likely to happen unnoticed, since saves now happen without anyone clicking anything. Worth flagging if beta users hit it |
| **Save frequency limits** | None on the client | If Adithya adds server-side rate limiting to the files route, the 1.5s pause should already be gentle enough — but this hasn't been confirmed with him |
| **Autosave indicator while idle** | Works, but easy to miss | The status text in the TopBar updates correctly; there's no separate "autosaving now" animation. Not required by the milestone, worth a design pass later |
| **Retrying a failed autosave** | Only retries on your next keystroke or next Save click | A save that fails while you're away from the keyboard just sits failed until you return and type again, or click Save |

---

# How to prove Day 7 is done

1. Type in the code editor, then stop and wait about two seconds without touching Save — the unsaved dot disappears and the bar says "All changes saved" on its own.
2. Type continuously for several seconds — no save happens mid-typing; it only happens after you actually pause.
3. Edit `index.html`, then immediately click over to `styles.css` — check the network tab: the save for `index.html`'s edit fires right away, not after a delay.
4. Create, rename, or delete a file — each one saves immediately.
5. Switch from Advanced mode back to the simple view while something is unsaved — it saves first.
6. Turn off wifi, type, and wait — the pause-triggered save fails with the same plain-English message as Day 6; dots stay lit; turning wifi back on and typing again (or pressing Save) succeeds.
7. Open project A, type something, and switch to project B before 1.5 seconds pass — confirm in the network tab that no save request goes out for project A after you've left it.
8. `npm run test` — all tests pass, including the two new files.

---

# The ideas behind Day 7

1. **A pause is a hint, not a promise.** 1.5 seconds without typing is a reasonable guess that a thought is finished — not a guarantee, which is why Save and the tab-close guard still exist as backups.
2. **Certainty beats waiting.** Anything the user clearly finished on purpose — switching files, renaming, deleting — saves immediately. Only continuous typing gets debounced.
3. **One save path, always.** Autosave doesn't get its own version of `saveProject`. It calls the exact same function Save does, with the exact same safety checks. Two paths to the same action is where bugs like double-saving come from.
4. **Never save to a project you've left.** Every load cancels the outgoing project's pending clock before starting the next one.
