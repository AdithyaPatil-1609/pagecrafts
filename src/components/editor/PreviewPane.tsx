'use client';
import { useMemo } from 'react';
import { useEditorStore } from '@/lib/editor-store';

function assemble(files: Record<string, string>): string {
    const page = files['index.html'] ?? '';
    return page.replace(/<link\b[^>]*>/gi, (tag) => {
        if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
        const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!href) return tag;
        const css = files[href.replace(/^\.?\//, '')];
        return css ? `<style>\n${css}\n</style>` : tag;
    });
}

export default function PreviewPane() {
    const vfs = useEditorStore((s) => s.vfs);

    const doc = useMemo(() => assemble(vfs.toMap()), [vfs]);

    return (
        <iframe
            title="Preview"
            sandbox="allow-scripts"
            srcDoc={doc}
            className="h-full w-full border-0 bg-white"
        />
    );
}