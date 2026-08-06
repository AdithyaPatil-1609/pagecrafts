import { EditorView } from '@codemirror/view';

export const pagecraftTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '13px',
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight: '1.6',
    },
    '.cm-content': { padding: '12px 0' },
    '.cm-gutters': {
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--muted-foreground))',
        border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'hsl(var(--muted) / 0.4)' },
    '.cm-activeLineGutter': {
        backgroundColor: 'hsl(var(--muted) / 0.4)',
        color: 'hsl(var(--foreground))',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'hsl(var(--primary))' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'hsl(var(--primary) / 0.2)',
    },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
        backgroundColor: 'hsl(var(--primary) / 0.15)',
        outline: '1px solid hsl(var(--primary) / 0.4)',
    },
});