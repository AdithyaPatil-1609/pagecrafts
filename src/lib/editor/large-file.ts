/** Highlighting a huge file stalls the editor. Past this, CodeMirror stays plain. */
export const LARGE_FILE_CHARS = 200_000;
export const LARGE_FILE_LINES = 8_000;

export function isLargeFile(content: string): boolean {
    if (content.length >= LARGE_FILE_CHARS) return true;

    let lines = 1;
    for (let i = 0; i < content.length; i++) {
        if (content.charCodeAt(i) === 10) {
            lines += 1;
            if (lines >= LARGE_FILE_LINES) return true;
        }
    }
    return false;
}

export function shouldHighlight(content: string): boolean {
    return !isLargeFile(content);
}
