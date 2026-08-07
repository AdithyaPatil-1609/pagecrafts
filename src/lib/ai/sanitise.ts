const PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
    ['script', /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi],
    ['script-open', /<\/?script\b[^>]*>/gi],
    ['iframe', /<\/?iframe\b[^>]*>/gi],
    ['object-embed', /<\/?(object|embed)\b[^>]*>/gi],
    ['event-handler', /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi],
    ['javascript-url', /\s(href|src|action)\s*=\s*(?:"|')?\s*javascript:[^"'>\s]*/gi],
];

export interface SanitiseResult {
    clean: string;
    removed: string[];
}

export function sanitise(input: string): SanitiseResult {
    const removed: string[] = [];
    let clean = input;

    for (const [label, pattern] of PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(clean)) removed.push(label);
        pattern.lastIndex = 0;
        clean = clean.replace(pattern, '');
    }

    return { clean: clean.trim(), removed };
}

export function stripFences(text: string): string {
    return text
        .replace(/^\s*```[a-z]*\s*\n?/i, '')
        .replace(/\n?\s*```\s*$/i, '')
        .trim();
}

export function sanitiseDeep<T>(value: T): T {
    if (typeof value === 'string') return sanitise(value).clean as T;
    if (Array.isArray(value)) return value.map(sanitiseDeep) as T;
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitiseDeep(v)]),
        ) as T;
    }
    return value;
}