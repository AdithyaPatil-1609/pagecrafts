export type ChangeLine =
    | { kind: 'same'; text: string }
    | { kind: 'added'; text: string }
    | { kind: 'removed'; text: string };

export interface ComparedText {
    lines: ChangeLine[];
    addedCount: number;
    removedCount: number;
    isEmpty: boolean;
}

export function compareText(before: string, after: string): ComparedText {
    const a = before.split('\n');
    const b = after.split('\n');

    const table: number[][] = Array.from({ length: a.length + 1 }, () =>
        new Array<number>(b.length + 1).fill(0),
    );

    for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
            table[i][j] =
                a[i] === b[j]
                    ? table[i + 1][j + 1] + 1
                    : Math.max(table[i + 1][j], table[i][j + 1]);
        }
    }

    const lines: ChangeLine[] = [];
    let i = 0;
    let j = 0;

    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            lines.push({ kind: 'same', text: a[i] });
            i++;
            j++;
        } else if (table[i + 1][j] >= table[i][j + 1]) {
            lines.push({ kind: 'removed', text: a[i] });
            i++;
        } else {
            lines.push({ kind: 'added', text: b[j] });
            j++;
        }
    }

    while (i < a.length) lines.push({ kind: 'removed', text: a[i++] });
    while (j < b.length) lines.push({ kind: 'added', text: b[j++] });

    const addedCount = lines.filter((l) => l.kind === 'added').length;
    const removedCount = lines.filter((l) => l.kind === 'removed').length;

    return {
        lines,
        addedCount,
        removedCount,
        isEmpty: addedCount === 0 && removedCount === 0,
    };
}

function plural(count: number): string {
    return count === 1 ? 'line' : 'lines';
}

export function describeChange(compared: ComparedText): string {
    const { addedCount, removedCount } = compared;

    if (compared.isEmpty) return 'Nothing would change.';
    if (removedCount === 0) return `Adds ${addedCount} new ${plural(addedCount)}.`;
    if (addedCount === 0) return `Removes ${removedCount} ${plural(removedCount)}.`;
    if (addedCount === removedCount)
        return `Rewrites ${addedCount} ${plural(addedCount)}.`;

    return `Rewrites part of the file — ${addedCount} ${plural(addedCount)} in, ${removedCount} ${plural(removedCount)} out.`;
}