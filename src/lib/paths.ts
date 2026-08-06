export interface PathError {
    code: 'invalid_path' | 'duplicate_path';
    message: string;
}

const ILLEGAL = /[<>:"\\|?*\u0000-\u001f]/;

export function validatePath(path: string, existing: string[]): PathError | null {
    const p = path.trim();

    if (!p) return { code: 'invalid_path', message: 'Name cannot be empty.' };

    if (p.startsWith('/') || p.endsWith('/'))
        return { code: 'invalid_path', message: 'Name cannot start or end with a slash.' };

    if (p.includes('//'))
        return { code: 'invalid_path', message: 'Name cannot contain an empty folder.' };

    if (p.split('/').some((seg) => seg === '.' || seg === '..'))
        return { code: 'invalid_path', message: 'Name cannot contain "." or "..".' };

    if (ILLEGAL.test(p))
        return { code: 'invalid_path', message: 'Name contains invalid characters.' };

    if (existing.includes(p))
        return { code: 'duplicate_path', message: 'A file with that name already exists.' };

    return null;
}