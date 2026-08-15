import type { Composition } from '@/lib/contracts';
import { compositionToFiles } from '@/lib/ai/generate/to-files';
import type { VFS } from '@/lib/vfs';

/** Rebuild the page files from a composition, without rewriting composition.json. */
export function writeRenderedSite(vfs: VFS, composition: Composition): void {
    const files = compositionToFiles(composition);
    for (const [path, content] of Object.entries(files)) {
        vfs.write(path, content);
    }
}

/** Keep the file tree in step with the composition the sections panel edits. */
export function writeCompositionFiles(vfs: VFS, composition: Composition): void {
    vfs.write('composition.json', JSON.stringify(composition, null, 2));
    writeRenderedSite(vfs, composition);
}
