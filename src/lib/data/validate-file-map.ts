import type { FileMap } from '@/lib/contracts';

export const MAX_FILES = 50;
export const MAX_TEXT_BYTES = 2_097_152;

const LEADING_SLASH = /^\//;
const DOT_DOT = /(^|\/)\.\.(\/|$)/;
const NUL = /�/;

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