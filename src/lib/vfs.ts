import type { VFile, FileType, TreeNode } from '@/lib/contracts';

type Listener = () => void;

export class VFS {
    private files = new Map<string, VFile>();
    private listeners = new Set<Listener>();

    subscribe(fn: Listener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private emit(): void {
        for (const fn of this.listeners) fn();
    }

    read(path: string): string | null {
        return this.files.get(path)?.content ?? null;
    }

    write(path: string, content: string, type: FileType = 'text'): void {
        this.files.set(path, { content, dirty: true, type });
        this.emit();
    }

    seed(map: Record<string, string>): void {
        for (const [path, content] of Object.entries(map)) {
            this.files.set(path, { content, dirty: false, type: 'text' });
        }
        this.emit();
    }

    rename(from: string, to: string): boolean {
        const file = this.files.get(from);
        if (!file || this.files.has(to)) return false;
        this.files.delete(from);
        this.files.set(to, { ...file, dirty: true });
        this.emit();
        return true;
    }

    delete(path: string): boolean {
        const existed = this.files.delete(path);
        if (existed) this.emit();
        return existed;
    }

    paths(): string[] {
        return [...this.files.keys()];
    }

    dirtyPaths(): string[] {
        return [...this.files.entries()].filter(([, f]) => f.dirty).map(([p]) => p);
    }
    reset(): void {
        this.files.clear();
        this.emit();
    }
    markClean(): void {
        for (const [path, file] of this.files) {
            this.files.set(path, { ...file, dirty: false });
        }
        this.emit();
    }

    toMap(): Record<string, string> {
        return Object.fromEntries([...this.files].map(([p, f]) => [p, f.content]));
    }

    list(): TreeNode {
        const root: TreeNode = { name: '', path: '', kind: 'dir', children: [] };
        for (const path of [...this.files.keys()].sort()) {
            const parts = path.split('/');
            let node = root;
            parts.forEach((part, i) => {
                const isLeaf = i === parts.length - 1;
                const childPath = parts.slice(0, i + 1).join('/');
                let child = node.children!.find((c) => c.name === part);
                if (!child) {
                    child = {
                        name: part,
                        path: childPath,
                        kind: isLeaf ? 'file' : 'dir',
                        ...(isLeaf ? {} : { children: [] }),
                    };
                    node.children!.push(child);
                }
                node = child;
            });
        }
        return root;
    }
}