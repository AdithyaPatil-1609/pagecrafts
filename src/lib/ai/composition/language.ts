/**
 * Names the person wrote in another script stay in that script.
 *
 * Fill likes to transliterate (D15 v29: मिठास स्वीट्स → "Mithaas Sweet Shop"
 * on the hero). Prompt guidance is a request; this repair is the constraint.
 */

function isNonLatinLetter(ch: string): boolean {
    return /\p{L}/u.test(ch) && !/\p{Script=Latin}/u.test(ch);
}

function isMark(ch: string): boolean {
    return /\p{M}/u.test(ch);
}

export function isLatinLetterOnly(s: string): boolean {
    for (const ch of s) {
        if (isNonLatinLetter(ch)) return false;
    }
    return true;
}

/** Letter-runs in the description that are not Latin script. */
export function nativeNamesIn(prompt: string): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    let buf = '';

    const flush = () => {
        const t = buf.replace(/[\s\u00A0]+/g, ' ').trim();
        buf = '';
        if (!t || seen.has(t)) return;
        seen.add(t);
        names.push(t);
    };

    for (const ch of prompt) {
        if (isNonLatinLetter(ch) || (isMark(ch) && buf.length > 0)) {
            buf += ch;
        } else if ((ch === ' ' || ch === '\u00A0') && buf.length > 0) {
            buf += ch;
        } else {
            flush();
        }
    }
    flush();
    return names;
}

/** The business name they actually typed — first native run, usually the start. */
export function primaryNativeName(prompt: string): string | null {
    return nativeNamesIn(prompt)[0] ?? null;
}

export function askedToKeepNativeScript(prompt: string): boolean {
    return /\b(in|into)\s+(hindi|tamil|telugu|kannada|malayalam|marathi|bengali|gujarati|punjabi|urdu|arabic|korean|japanese|chinese|spanish|french)\b/i.test(prompt)
        || /\b(keep the .{0,24} name|name in \w+|at the top)\b/i.test(prompt);
}

export function nativeHeadingBrief(name: string): string {
    return `show exactly "${name}" — same letters, same script, never a transliteration`;
}

/**
 * If fill wrote a Latin transliteration of a name the person spelled in
 * another script, put their spelling back. Leave mixed-script headings alone.
 */
export function preserveNativeHeading(current: string, prompt: string, maxLength?: number): string {
    const name = primaryNativeName(prompt);
    if (!name) return current;
    if (current.includes(name)) return current;
    if (!isLatinLetterOnly(current)) return current;
    if (maxLength !== undefined && [...name].length > maxLength) return current;
    return name;
}

const PINNED_KEYS = ['heading', 'tagline'] as const;

export function preserveNativeFields(
    obj: Record<string, unknown>,
    prompt: string,
    maxByKey: Readonly<Record<string, number | undefined>> = {},
): void {
    if (!primaryNativeName(prompt)) return;
    for (const key of PINNED_KEYS) {
        const val = obj[key];
        if (typeof val !== 'string') continue;
        obj[key] = preserveNativeHeading(val, prompt, maxByKey[key]);
    }
}
