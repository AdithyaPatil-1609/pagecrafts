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