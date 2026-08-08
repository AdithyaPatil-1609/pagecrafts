# PageCraft Editor — Day 6, Every File Explained

Day 6 · Frontend / Editor (R1) · Preethi · all paths are from the repo root

---

## What Day 6 is, in one sentence

The timeline grid says:

> **D6 · Preethi · Frontend / Editor** — Wire persistence to Pragna + Adhyay's file-persistence API (load / save project).

In plain words: **stop pretending, start saving.**

Until now the editor made up its own files and threw away every change the moment you refreshed. Today the editor starts talking to the real server. Files come *from* the database when you open a project, and go *back into* the database when you press Save.

---

## Where things stood at the end of Day 5

Three things were fake, and everyone knew it:

| Thing | What it actually did |
|---|---|
| Opening a project | Waited 250ms to look busy, then handed back two hard-coded sample files (`src/lib/seed.ts`) |
| Pressing Save | Printed `save` and a list of file names into the browser console. Nothing left the browser |
| Refreshing the page | Everything you typed disappeared |

That was correct for Day 5 — the Skeleton demo only had to *look* walkable. But Adhyay's real endpoints now exist:

- `GET /api/v1/projects/{id}/files` → gives back every file in the project
- `PUT /api/v1/projects/{id}/files` → replaces every file in the project

Both are already written and live in `src/app/api/v1/projects/[id]/files/route.ts`. Nobody is using them yet. That is my job today.

---

## What must be true when Day 6 ends

1. Open a project → the files shown are the ones in the database, not the seed.
2. Type something → press Save → close the tab → open it again → your typing is still there.
3. If the save fails, the screen says so in normal English, and the unsaved dots **stay lit**. It never lies about having saved.
4. If you try to close the tab with unsaved work, the browser stops you.

Point 3 matters more than it sounds. A tool that says "Saved" when it did not save is worse than a tool with no Save button at all.

---

## The shape of Day 6, in one picture

```
The browser                                    The server (Adhyay's)
│                                              │
├── src/lib/api/messages.ts ....... NEW        │
│      turns error codes into English          │
│                                              │
├── src/lib/api/client.ts ......... NEW        │
│      the one place that calls the server ────┼──► GET  /api/v1/projects/{id}/files
│      and unwraps the reply                   │    PUT  /api/v1/projects/{id}/files
│                                              │
├── src/lib/project-source.ts ..... CHANGED    │
│      the two project jobs: load, save        │
│                                              │
├── src/lib/editor-store.ts ....... CHANGED    │
│      now knows: saving? saved when? failed?  │
│                                              │
├── src/hooks/useUnsavedGuard.ts .. NEW        │
│      "you have unsaved changes" on tab close │
│                                              │
├── src/components/editor/TopBar.tsx . CHANGED │
│      shows the real save state               │
│                                              │
└── tests/unit/
    ├── api-client.test.ts ........ NEW
    └── project-source.test.ts .... CHANGED
```

**The rule that shapes all of it:** exactly one file is allowed to call `fetch`. Everything else asks that file. If the server's reply format ever changes, I edit one file, not fifteen.

---

## The workflow — what actually happens when you press Save

Follow one click all the way through. This is the part worth understanding, because five people's work is sitting on this path.

1. You type in the code editor. The store writes it into the in-memory file box (VFS) and marks that file **dirty**.
2. The TopBar notices and shows "1 unsaved change". The file gets a dot next to it in the tree.
3. You press **Save** (or Ctrl/Cmd+S).
4. The store takes **every file in the box**, not just the dirty ones, and hands them to `saveProjectFiles`.
5. That calls `apiPut`, the single fetch helper, which sends them to `PUT /api/v1/projects/{id}/files`.
6. Adhyay's route checks the file list — max 50 files, max 2MB of text, no `..` in paths, no leading slash (`src/lib/data/validate-file-map.ts`).
7. Supabase decides whether this project is yours. If it isn't yours, you get nothing back — the row does not exist as far as you are concerned. That is Adithya's row-level security doing its job.
8. The server replies in the team's standard envelope: `{ ok: true, data }` or `{ ok: false, error }`.
9. My client unwraps it. On success the store marks every file clean, the dots go away, and the bar says "All changes saved". On failure the dots stay, and the bar shows the reason.

### Why step 4 sends *everything*, not just the changed files

Because `PUT` means **replace the whole tree**. If you deleted `about.html`, the only way the server learns about it is that `about.html` is missing from what I send. Sending only the dirty files would silently resurrect every deleted file on the next load. This is the single most likely bug in the whole day, and it is avoided by one word: `toMap()`.

---

# Files to create

---

## 1 · `src/lib/api/messages.ts`

**Why it exists.** The server speaks in codes — `not_found`, `rate_limited`, `forbidden`. A person should never see those words. This file is the translation table, kept apart from everything else so that the copy can be rewritten by anyone without touching logic.

**What the code does as a whole.** It holds one plain-English sentence for each of the ten agreed error codes, plus one sentence for "the internet is not working", and a small function to look one up.

```ts
import type { ErrorCode } from '@/lib/contracts';

export const OFFLINE_MESSAGE = 'We could not reach PageCraft. Check your connection and try again.';

export const UNREADABLE_MESSAGE = 'The server sent back something we could not read.';

const FRIENDLY: Record<ErrorCode, string> = {
    unauthorized: 'Please sign in again to continue.',
    forbidden: 'This project belongs to someone else.',
    not_found: 'We could not find this project.',
    rate_limited: 'That was a lot of saves at once. Wait a moment and try again.',
    spend_capped: 'The daily limit has been reached. Please try again tomorrow.',
    validation_failed: 'Some of your files were rejected.',
    generation_failed: 'The site could not be generated.',
    payment_required: 'This needs an upgrade before it can run.',
    hosting_error: 'The hosting service did not respond.',
    internal: 'Something went wrong on our side. Your work is safe in this tab.',
};

export function friendlyMessage(code: ErrorCode, fallback: string): string {
    return FRIENDLY[code] ?? fallback;
}
```

**Why the codes are already fixed.** Those ten names are frozen in `contracts.md` from Day 1. I am not inventing them; I am covering all of them. If Adhyay adds an eleventh code, TypeScript refuses to build this file until I write a sentence for it. That is deliberate — a new error can never reach a user as a blank box.

**Impact on the website.** Every failure message in the editor now sounds like a person wrote it.

---

## 2 · `src/lib/api/client.ts`

**Why it exists.** Calling the server is fiddly and the fiddly parts are the same every time: set the JSON header, survive the network being down, survive a reply that isn't JSON at all, open the `{ ok, data }` envelope, pull the error out. Doing that at ten call sites means nine chances to forget one.

**What the code does as a whole.** It makes the request, and no matter what goes wrong it returns the same simple shape — `{ data, error }` where exactly one of the two is filled in. The caller never sees a `Response`, never sees a status code, never needs a `try`/`catch`.

```ts
import type { ApiResult } from '@/lib/contracts';
import { friendlyMessage, OFFLINE_MESSAGE, UNREADABLE_MESSAGE } from './messages';

export interface CallResult<T> {
    data: T | null;
    error: string | null;
}

async function call<T>(path: string, init?: RequestInit): Promise<CallResult<T>> {
    let response: Response;

    try {
        response = await fetch(path, {
            ...init,
            headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
        });
    } catch {
        return { data: null, error: OFFLINE_MESSAGE };
    }

    let body: ApiResult<T>;

    try {
        body = (await response.json()) as ApiResult<T>;
    } catch {
        return { data: null, error: UNREADABLE_MESSAGE };
    }

    if (!body || typeof body !== 'object' || !('ok' in body)) {
        return { data: null, error: UNREADABLE_MESSAGE };
    }

    if (!body.ok) {
        return { data: null, error: friendlyMessage(body.error.code, body.error.message) };
    }

    return { data: body.data, error: null };
}

export function apiGet<T>(path: string): Promise<CallResult<T>> {
    return call<T>(path);
}

export function apiPut<T>(path: string, payload: unknown): Promise<CallResult<T>> {
    return call<T>(path, { method: 'PUT', body: JSON.stringify(payload) });
}
```

**Why there is no `throw` anywhere in it.** Thrown errors have to be caught, and a forgotten `catch` in a React component crashes the whole editor to a white screen. Returning the failure as a value means the caller cannot forget it — the `error` field is right there.

**Impact on the website.** Pull out your wifi and press Save: you get "We could not reach PageCraft", the dots stay lit, and the editor keeps working. Nothing crashes.

---

## 3 · `src/hooks/useUnsavedGuard.ts`

**Why it exists.** Autosave does not arrive until Day 7. Until then a stray Cmd+W throws away an afternoon. The browser has a built-in "are you sure you want to leave?" dialog, and this is how you ask for it.

**What the code does as a whole.** While there is at least one unsaved file, it asks the browser to confirm before the tab closes or reloads. The moment everything is saved, it removes the warning again — so a clean editor closes instantly with no annoying prompt.

```tsx
'use client';
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/editor-store';

export function useUnsavedGuard(): void {
    const unsavedCount = useEditorStore((s) => s.dirtyPaths.length);

    useEffect(() => {
        if (unsavedCount === 0) return;

        function onBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
            event.returnValue = '';
        }

        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [unsavedCount]);
}
```

**One thing to know.** Browsers do not let us choose the wording of that dialog — it is deliberately fixed so that sites cannot write scary messages. We only get to decide whether it appears.

**Impact on the website.** Close the tab mid-edit and the browser asks first.

---

## 4 · `tests/unit/api-client.test.ts`

**Why it exists.** The client is the piece every future feature will lean on — AI edits, version history, publish. Its four behaviours need to be nailed down now so that nobody quietly breaks them in week 3. There is no server in these tests; `fetch` is replaced with a fake one.

**What the code does as a whole.** It checks four things: a good reply hands back the data, a bad reply becomes an English sentence, a dead network becomes an English sentence, and a save actually sends the files as JSON with the `PUT` method.

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPut } from '@/lib/api/client';

function replyWith(body: unknown) {
    return vi.fn().mockResolvedValue({ json: async () => body } as Response);
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('api client', () => {
    it('hands back the data when the envelope is ok', async () => {
        vi.stubGlobal('fetch', replyWith({ ok: true, data: { files: { 'index.html': 'hi' } } }));

        const result = await apiGet<{ files: Record<string, string> }>('/api/v1/projects/p1/files');

        expect(result.error).toBeNull();
        expect(result.data).toEqual({ files: { 'index.html': 'hi' } });
    });

    it('turns an error code into a plain sentence', async () => {
        vi.stubGlobal(
            'fetch',
            replyWith({ ok: false, error: { code: 'not_found', message: 'That project does not exist.' } }),
        );

        const result = await apiGet('/api/v1/projects/missing/files');

        expect(result.data).toBeNull();
        expect(result.error).toBe('We could not find this project.');
    });

    it('reports a friendly message when the network is down', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

        const result = await apiPut('/api/v1/projects/p1/files', { files: {} });

        expect(result.error).toContain('could not reach');
    });

    it('sends the files as JSON on a save', async () => {
        const fetchMock = replyWith({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        await apiPut('/api/v1/projects/p1/files', { files: { 'index.html': '<h1>hi</h1>' } });

        const [, init] = fetchMock.mock.calls[0];
        expect(init.method).toBe('PUT');
        expect(JSON.parse(init.body)).toEqual({ files: { 'index.html': '<h1>hi</h1>' } });
    });
});
```

**Impact on the website.** None directly. It is the reason a change on Day 14 will not silently break saving on Day 6's code.

---

# Files to change, rather than create

---

## 5 · `src/lib/project-source.ts` (rewritten)

**Why it changes.** This is the file that lied. It returned the seed project and had no save function at all. Now it becomes the two real jobs a project needs: fetch me the files, store these files.

**What the code does as a whole.** It builds the correct URL for a project, asks the client to load or save, and reshapes the answer into something the store can use directly. `pickEntryFile` is untouched — it still decides which file the editor opens first.

```ts
import { apiGet, apiPut } from '@/lib/api/client';
import type { FileMap, GetProjectFilesResponse } from '@/lib/contracts';

export interface ProjectLoadResult {
    files: FileMap;
    updatedAt: string | null;
    error: string | null;
}

export interface ProjectSaveResult {
    updatedAt: string | null;
    error: string | null;
}

const EMPTY_REPLY = 'The server replied with nothing at all.';

function filesUrl(projectId: string): string {
    return `/api/v1/projects/${encodeURIComponent(projectId)}/files`;
}

export async function loadProjectFiles(projectId: string): Promise<ProjectLoadResult> {
    if (!projectId.trim()) {
        return { files: {}, updatedAt: null, error: 'No project was requested.' };
    }

    const { data, error } = await apiGet<GetProjectFilesResponse>(filesUrl(projectId));

    if (error || !data) {
        return { files: {}, updatedAt: null, error: error ?? EMPTY_REPLY };
    }

    return { files: data.files, updatedAt: data.updatedAt, error: null };
}

export async function saveProjectFiles(
    projectId: string,
    files: FileMap,
): Promise<ProjectSaveResult> {
    if (Object.keys(files).length === 0) {
        return { updatedAt: null, error: 'A project must have at least one file.' };
    }

    const { data, error } = await apiPut<GetProjectFilesResponse>(filesUrl(projectId), { files });

    if (error || !data) {
        return { updatedAt: null, error: error ?? EMPTY_REPLY };
    }

    return { updatedAt: data.updatedAt, error: null };
}

export function pickEntryFile(paths: string[]): string | null {
    if (paths.length === 0) return null;
    if (paths.includes('index.html')) return 'index.html';
    return [...paths].sort()[0] ?? null;
}
```

**The empty-project check is not optional.** Adhyay's validator rejects an empty file list with `validation_failed`. Catching it here means the user gets told before we waste a round trip — and, more importantly, we never send a request that would wipe their whole site.

**`src/lib/seed.ts` is now unused by the editor.** I am leaving the file alone rather than deleting it — Hanish's harness and some tests still read it, and deleting shared things on a Tuesday is how you break someone else's afternoon.

---

## 6 · `src/lib/editor-store.ts` (changed)

**Why it changes.** The store is the single source of truth for the screen. Three new truths exist today: *are we saving right now*, *did the last save fail*, and *when did it last succeed*. And `saveProject` finally does something.

**What the code does as a whole.** It remembers which project is open, sends the entire file box to the server on save, marks everything clean only when the server confirms, and refuses to start a second save while one is already running.

```ts
'use client';
import { create } from 'zustand';
import { VFS } from '@/lib/vfs';
import { validatePath, type PathError } from '@/lib/paths';
import { loadProjectFiles, saveProjectFiles, pickEntryFile } from '@/lib/project-source';
import type { TreeNode } from '@/lib/contracts';

const vfs = new VFS();

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

    openFile: (path) => set({ activeFile: path }),

    writeActive: (content) => {
        const { vfs, activeFile } = get();
        if (activeFile) vfs.write(activeFile, content);
    },

    toggleAdvanced: () => set((s) => ({ advanced: !s.advanced })),

    refresh: () => set({ tree: vfs.list(), dirtyPaths: vfs.dirtyPaths() }),

    createFile: (path) => {
        const { vfs } = get();
        const err = validatePath(path, vfs.paths());
        if (err) return err;
        const clean = path.trim();
        vfs.write(clean, '');
        set({ activeFile: clean });
        return null;
    },

    renameFile: (from, to) => {
        const { vfs, activeFile } = get();
        const err = validatePath(to, vfs.paths().filter((p) => p !== from));
        if (err) return err;
        const clean = to.trim();
        vfs.rename(from, clean);
        if (activeFile === from) set({ activeFile: clean });
        return null;
    },

    deleteFile: (path) => {
        const { vfs, activeFile } = get();
        vfs.delete(path);
        if (activeFile === path) set({ activeFile: vfs.paths()[0] ?? null });
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
}));

vfs.subscribe(() => useEditorStore.getState().refresh());
```

**`markClean()` runs after the server answers, never before.** If the request fails, the dirty dots are still there and the Save button is still alive. The screen and the database never disagree.

**The `if (saving) return;` guard.** Hold Cmd+S down and you would otherwise fire twenty saves that finish out of order, the oldest one landing last and overwriting newer text. One save at a time.

---

## 7 · `src/components/editor/TopBar.tsx` (changed)

**Why it changes.** The bar currently only knows "N unsaved changes". It now has to show four different states clearly: saving, saved, unsaved, and failed.

**What the code does as a whole.** It picks one short status line based on what the store says, colours a failure red, and disables the Save button while a save is in flight.

```tsx
'use client';
import { useEditorStore } from '@/lib/editor-store';

function statusLine(saving: boolean, saveError: string | null, unsaved: number, savedAt: string | null) {
    if (saving) return { text: 'Saving…', tone: 'muted' as const };
    if (saveError) return { text: saveError, tone: 'error' as const };
    if (unsaved > 0)
        return { text: `${unsaved} unsaved ${unsaved === 1 ? 'change' : 'changes'}`, tone: 'muted' as const };
    if (savedAt) return { text: 'All changes saved', tone: 'muted' as const };
    return null;
}

export default function TopBar({ projectId }: { projectId: string }) {
    const advanced = useEditorStore((s) => s.advanced);
    const toggleAdvanced = useEditorStore((s) => s.toggleAdvanced);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);
    const saveProject = useEditorStore((s) => s.saveProject);
    const saving = useEditorStore((s) => s.saving);
    const saveError = useEditorStore((s) => s.saveError);
    const lastSavedAt = useEditorStore((s) => s.lastSavedAt);

    const status = statusLine(saving, saveError, dirtyPaths.length, lastSavedAt);

    return (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-medium">{projectId}</span>
            <div className="flex items-center gap-3">
                {status && (
                    <span
                        className={
                            status.tone === 'error'
                                ? 'max-w-xs truncate text-xs text-destructive'
                                : 'text-xs text-muted-foreground'
                        }
                        title={status.text}
                    >
                        {status.text}
                    </span>
                )}
                <button
                    onClick={toggleAdvanced}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    {advanced ? 'Exit Advanced' : 'Advanced'}
                </button>
                <button
                    disabled={dirtyPaths.length === 0 || saving}
                    onClick={saveProject}
                    className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-40"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </header>
    );
}
```

**Note the wording.** "All changes saved", not "Committed" or "Pushed". The product framing decided on Day 1 says GitHub words never appear in front of a user.

---

## 8 · `src/components/editor/EditorShell.tsx` (small change)

**Why it changes.** One line, to switch on the unsaved-work guard.

```tsx
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';

export default function EditorShell({ projectId }: { projectId: string }) {
    useUnsavedGuard();
    // …the rest of Day 1–4's shell is unchanged
}
```

---

## 9 · `tests/unit/project-source.test.ts` (changed)

**Why it changes.** Two of its tests assert the old fake behaviour — that any project id returns files. With a real server those tests are wrong. The `pickEntryFile` tests stay exactly as they are.

**What the code does as a whole.** It replaces the two load tests with ones that use a fake server: an empty id never calls out at all, a good reply comes back as files, and an error reply comes back as a sentence.

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadProjectFiles, saveProjectFiles } from '@/lib/project-source';

function replyWith(body: unknown) {
    return vi.fn().mockResolvedValue({ json: async () => body } as Response);
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('loadProjectFiles', () => {
    it('does not call the server when there is no project id', async () => {
        const fetchMock = replyWith({ ok: true, data: {} });
        vi.stubGlobal('fetch', fetchMock);

        const { error } = await loadProjectFiles('');

        expect(error).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns the files the server sent', async () => {
        vi.stubGlobal(
            'fetch',
            replyWith({
                ok: true,
                data: { projectId: 'p1', files: { 'index.html': 'hi' }, updatedAt: 'now' },
            }),
        );

        const { files, updatedAt, error } = await loadProjectFiles('p1');

        expect(error).toBeNull();
        expect(files).toEqual({ 'index.html': 'hi' });
        expect(updatedAt).toBe('now');
    });

    it('passes a server error back as a readable sentence', async () => {
        vi.stubGlobal(
            'fetch',
            replyWith({ ok: false, error: { code: 'forbidden', message: 'nope' } }),
        );

        const { files, error } = await loadProjectFiles('someone-elses-project');

        expect(error).toBe('This project belongs to someone else.');
        expect(Object.keys(files)).toHaveLength(0);
    });
});

describe('saveProjectFiles', () => {
    it('refuses to send an empty project', async () => {
        const fetchMock = replyWith({ ok: true, data: {} });
        vi.stubGlobal('fetch', fetchMock);

        const { error } = await saveProjectFiles('p1', {});

        expect(error).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
```

---

# How my Day 6 affects everyone else

This is the first day the editor stops being an island. Five columns start touching.

| Person | Their column | What changes for them today |
|---|---|---|
| **Adhyay** | Backend + Publish | His `GET`/`PUT` files endpoints get their first real user. Anything wrong with them — a field named differently, a status code, a missing `updatedAt` — surfaces today rather than at the D10 milestone. If I find a mismatch, it is a contract conversation, not a quiet fix on my side |
| **Pragna** | Discovery + Templates | The fork-a-template flow only makes sense if a forked project can then be opened and saved. From today, "fork" leads somewhere real. Her Day 8 content panel will save through this exact same path — she does not need to write any saving code, she calls `saveProject` |
| **Adithya** | Platform + Database | Row-level security is now doing real work: my editor will happily ask for any project id in the URL, and his rules are the only thing stopping someone reading a stranger's site. His D6 rate limiting also now has a client that can trip it — that is why `rate_limited` has a friendly message |
| **Hanish** | AI | His D8 scoped-edit endpoint returns a proposed change. My D8 change-summary component will accept it and write it into the same file box that saves through today's code. If saving is not solid today, his edits have nowhere to land |
| **You (D7 onwards)** | — | Autosave (D7) is now a small job instead of a large one: a timer that calls `saveProject`. All the hard parts — one-at-a-time, error text, clean marking — are already done |

**The one thing that could block others:** if `PUT` turns out to reject something the editor allows — a file name my `validatePath` permits but Adhyay's `validateFileMap` refuses — users hit a wall. The two rule sets should agree. That is worth ten minutes with Adhyay today, not a bug report on Day 10.

---

# What still isn't real after Day 6

| Thing | Status | Arrives |
|---|---|---|
| **Autosave** | You must press Save | D7 — autosave loop + explicit save points |
| **Two tabs open at once** | Last save wins, silently. We read `updatedAt` but do not yet check it | Not scheduled; raise it if beta users hit it |
| **Version history** | Saving does not create a commit | D9 Adhyay (commit history), D14 me (version list UI) |
| **Content panel saving** | The panel still has placeholder inputs | D8 Pragna, using this same save path |
| **Retry on a failed save** | You press Save again yourself | Fine for now; the work is never lost from the tab |

---

# How to prove Day 6 is done

Run these by hand before you call it finished:

1. Open a real project → the files in the tree match what is in the `project_files` table.
2. Change one line → Save → hard refresh → the line is still there. **This is the D10 milestone condition, met four days early.**
3. Delete a file → Save → refresh → it is still gone. (This is the `toMap()` check.)
4. Open a project id that isn't yours → "This project belongs to someone else", with a Try again button, no crash.
5. Turn off wifi → Save → "We could not reach PageCraft", dots stay lit → turn wifi back on → Save → works.
6. Type something → try to close the tab → the browser asks you first.
7. `npm run test` → the new and changed tests pass.

---

# The ideas behind Day 6

1. **One door to the server.** Every request in the app goes through one file, so error handling is written once and cannot be forgotten.
2. **Never claim a save that did not happen.** Clean marks come after the server confirms, never before.
3. **Send the whole tree, not the changes.** Deletions only travel as absences. Half a save is worse than no save.
4. **Errors are copy, not codes.** The user reads a sentence; the sentence lives in a file a non-engineer could edit.
5. **Do the boring safety work now.** One save at a time, warn before closing, refuse an empty project — three small guards that each prevent a real user losing real work.
