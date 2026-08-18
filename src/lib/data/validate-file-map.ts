import type { FileMap } from '@/lib/contracts';

export const MAX_FILES = 50;
export const MAX_TEXT_BYTES = 2_097_152;

const LEADING_SLASH = /^\//;
const DOT_DOT = /(^|\/)\.\.(\/|$)/;

// `\0`, written as an escape.
//
// This was a literal character in the source — and not a NUL. It was U+FFFD, the
// replacement character a text editor leaves behind when it saves a byte it could not
// decode. So the guard named NUL matched that character instead, let a real NUL byte
// straight through, and rejected a harmless replacement character somebody happened to
// paste. It had been that way since it was written (found by the R2 D19 encoding sweep,
// which is now tests/unit/copy-audit.test.ts — and which flags this comment too if the
// character is written out, so it is described rather than shown).
//
// The database's own CHECK — `position(chr(0) in path) = 0` — refused the path anyway, so
// nothing was ever stored with one. What was lost is the clean 422 this function exists to
// give: the caller got a constraint violation from Postgres instead.
//
// An escape rather than the character itself, so no future save can mangle it back.
const NUL = /\0/;

export interface FileIssue {
    path: string;
    message: string;
}

export function isValidFilePath(path: string): boolean {
    return (
        path.length > 0 &&
        !LEADING_SLASH.test(path) &&
        !DOT_DOT.test(path) &&
        !NUL.test(path)
    );
}

export function validateFileMap(files: FileMap): FileIssue[] {
    const issues: FileIssue[] = [];
    const paths = Object.keys(files ?? {});

    if (paths.length === 0) {
        return [{ path: 'files', message: 'At least one file is required.' }];
    }
    if (paths.length > MAX_FILES) {
        issues.push({
            path: 'files',
            message: `At most ${MAX_FILES} files are allowed (got ${paths.length}).`,
        });
    }

    let bytes = 0;
    const encoder = new TextEncoder();

    for (const path of paths) {
        if (!isValidFilePath(path)) {
            issues.push({ path, message: 'Invalid file path.' });
        }
        if (typeof files[path] !== 'string') {
            issues.push({ path, message: 'File content must be text.' });
            continue;
        }
        bytes += encoder.encode(files[path]).length;
    }

    if (bytes > MAX_TEXT_BYTES) {
        issues.push({
            path: 'files',
            message: `Total text is ${bytes} bytes; the limit is ${MAX_TEXT_BYTES}.`,
        });
    }

    return issues;
}