const RESERVED = new Set([
    'www', 'api', 'admin', 'app', 'mail', 'ftp',
    'blog', 'help', 'status', 'docs', 'static', 'assets',
]);

const MAX_LENGTH = 80;

export function toSlug(name: string): string {
    const base = name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_LENGTH)
        .replace(/-+$/g, '');

    return base || 'site';
}

export function isReserved(slug: string): boolean {
    return RESERVED.has(slug);
}

export async function uniqueSlug(
    name: string,
    isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
    const base = toSlug(name);
    const start = isReserved(base) ? `${base}-site` : base;

    if (!(await isTaken(start))) return start;

    for (let n = 2; n <= 999; n++) {
        const suffix = `-${n}`;
        const candidate = start.slice(0, MAX_LENGTH - suffix.length) + suffix;
        if (!(await isTaken(candidate))) return candidate;
    }

    throw new Error(`Could not find a free address for "${name}"`);
}