import { randomBytes } from 'node:crypto';
import { CONTAINMENT_RULE } from './prompts';

export interface Detection {
    /** Which untrusted field carried it. */
    field: string;
    /** Which detector fired — the family, for the log and the corpus. */
    rule: DetectionRule;
    /** A short excerpt, for the log. Never surfaced to the user. */
    excerpt: string;
}

export type DetectionRule =
    | 'instruction-override'
    | 'role-confusion'
    | 'system-prompt-probe'
    | 'html-comment-directive'
    | 'zero-width'
    | 'encoded-payload'
    | 'active-content'
    | 'delimiter-forgery';

export interface Envelope {
    system: string;
    user: string;
    /** Everything the detectors saw. Logged (BR-25), never shown to the user. */
    detections: Detection[];
}

// ── normalisation ──────────────────────────────────────────────────────────

/**
 * Invisible characters with no legitimate use in typed business copy: the
 * zero-width space, the directional marks and overrides, the word joiner and
 * invisible operators, the BOM, and the soft hyphen.
 *
 * ZWJ (U+200D) and ZWNJ (U+200C) are deliberately NOT here. They are ordinary
 * letters-in-waiting in Devanagari and Tamil \u2014 ZWNJ suppresses a ligature that
 * changes what a word says \u2014 and this product's corpus is full of Indic business
 * names (NFR-161). Stripping them globally would silently corrupt the names it
 * is meant to support. They are handled below instead.
 */
const INVISIBLE = /[\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/g;

/** Any zero-width character, for detection \u2014 including the two we preserve. */
const ANY_ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/;

/**
 * ZWJ/ZWNJ sitting between two ASCII letters, where they carry no linguistic
 * function and are being used to break up a word \u2014 `ig<ZWJ>nore`. Between
 * Indic characters, or next to an emoji, they are left alone.
 */
const ZERO_WIDTH_IN_LATIN = /(?<=[A-Za-z])[\u200C\u200D]+(?=[A-Za-z])/g;

/** Control characters, minus tab and newline, which are ordinary in typed text. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const DETECTORS: Array<[DetectionRule, RegExp]> = [
    ['instruction-override', /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|earlier|above|all|your|these|the user|user)\b[^.\n]{0,20}\b(instruction|prompt|rule|direction)/i],
    ['instruction-override', /\bnew\s+(instruction|rule|task|directive)s?\s*:/i],
    ['instruction-override', /\byou\s+are\s+now\b/i],
    ['system-prompt-probe', /\b(reveal|print|output|repeat|show|echo)\b[^.\n]{0,30}\b(system|initial|original)\b[^.\n]{0,15}\bprompt\b/i],
    ['system-prompt-probe', /\b(your|my)\s+(system\s+prompt|instructions|rules)\b/i],
    // A role label at the start of a line or after a sentence end — "gym in
    // powai. Assistant:" is the same attack as one at the top of the message.
    ['role-confusion', /(?:^|[\n.!?]\s*)(system|assistant|developer)\s*:/im],
    ['role-confusion', /<\|?(im_start|im_end|system|assistant)\|?>/i],
    // Any HTML comment. A business typing its own description does not write
    // them, and the model never needs to see one — so the presence of a comment
    // in untrusted content is itself the signal, not the words inside it.
    ['html-comment-directive', /<!--[\s\S]*?(?:-->|$)/],
    // Active content asked for, or smuggled in, through copy. The sanitiser
    // strips it either way (AC-F11-2); this is so the attempt is also logged.
    ['active-content', /<\s*(script|iframe|object|embed)\b|<\/\s*script|\son[a-z]+\s*=|javascript:/i],
    ['encoded-payload', /\\u00[0-9a-f]{2}(\\u00[0-9a-f]{2}){6,}/i],
    ['encoded-payload', /&(#x?[0-9a-f]{1,6}|lt|gt|quot);(\s*&(#x?[0-9a-f]{1,6}|lt|gt|quot);){5,}/i],
    // A long unbroken base64-ish run. Length keeps ordinary words and URLs out.
    ['encoded-payload', /\b[A-Za-z0-9+/]{40,}={0,2}\b/],
    // Content trying to close its own block. It cannot succeed — the nonce is
    // random per call — but attempting it is worth a log line.
    ['delimiter-forgery', /<\/?data(-[0-9a-f]{10})?\b/i],
];

function excerpt(text: string, at: number): string {
    return text.slice(Math.max(0, at - 20), at + 80).replace(/\s+/g, ' ').trim();
}

/** Reads the text; never rewrites it beyond stripping invisibles. */
export function detect(field: string, value: string): Detection[] {
    const found: Detection[] = [];

    // Detects every zero-width character, including the two that are preserved
    // for Indic text — a legitimate use is still worth a log line when it turns
    // up in the middle of a Latin word.
    if (ANY_ZERO_WIDTH.test(value)) {
        found.push({ field, rule: 'zero-width', excerpt: '(invisible characters)' });
    }

    for (const [rule, pattern] of DETECTORS) {
        const match = pattern.exec(value);
        if (match) {
            found.push({ field, rule, excerpt: excerpt(value, match.index) });
        }
        pattern.lastIndex = 0;
    }

    return found;
}

/**
 * Strips what carries no meaning to a reader: invisible characters and control
 * codes. Everything else is left exactly as typed — a business really might
 * describe itself with the word "ignore", and rewriting content to defuse it
 * would corrupt legitimate copy.
 *
 * ZWJ/ZWNJ survive unless they sit between two ASCII letters, which is the only
 * position where they cannot be doing linguistic work. `कोमला` keeps its
 * joiners; `ig<ZWJ>nore` loses them.
 */
export function neutralise(value: string): string {
    return value
        .replace(INVISIBLE, '')
        .replace(ZERO_WIDTH_IN_LATIN, '')
        .replace(CONTROL, '');
}

// ── the envelope ───────────────────────────────────────────────────────────

export interface EnvelopeInput {
    /** The real instruction. Trusted — it comes from a prompt file, not a user. */
    system: string;
    /** The trusted part of the user message, if any. */
    instruction?: string;
    /** Field name → untrusted text. */
    untrusted: Record<string, string>;
}

export type ContainmentLogger = (detections: Detection[]) => void;

let log: ContainmentLogger = (detections) => {
    for (const d of detections) {
        // BR-25: transparent by design — logged, never surfaced. The request
        // still completes; the user is not told, because telling them is itself
        // a channel and because a false positive would be alarming nonsense.
        console.warn(`[containment] ${d.rule} in "${d.field}": ${d.excerpt}`);
    }
};

export function setContainmentLogger(next: ContainmentLogger | null): void {
    log = next ?? log;
}

/**
 * The single constructor for any prompt carrying untrusted text (M3.7, FR-110).
 *
 * Each untrusted value goes inside a block tagged with a per-call random nonce.
 * The nonce is what makes the boundary unforgeable: a payload can write
 * `</data>` but cannot guess `</data-7f3a91c4e2>`, so it cannot close the block
 * and start issuing instructions.
 */
export interface Contained {
    /** The system message, with the containment rule attached. */
    system: string;
    /** The same field names, each value wrapped in a nonce-tagged data block. */
    values: Record<string, string>;
    detections: Detection[];
}

/**
 * The form the existing prompt templates use (FR-110).
 *
 * `envelope()` builds a whole user message; these templates already have their
 * own structure and their own placeholders, so this wraps each untrusted value
 * in place instead. The guarantee is the same one: no untrusted string reaches a
 * provider without a nonce-tagged boundary around it and the containment rule in
 * the system message.
 */
export function contain(
    system: string,
    untrusted: Record<string, string>,
): Contained {
    const nonce = randomBytes(5).toString('hex');
    const detections: Detection[] = [];
    const values: Record<string, string> = {};

    for (const [field, raw] of Object.entries(untrusted)) {
        detections.push(...detect(field, raw ?? ''));
        const safe = neutralise(raw ?? '').split(`data-${nonce}`).join('data-redacted');
        values[field] = `<data-${nonce} field="${field}">\n${safe}\n</data-${nonce}>`;
    }

    if (detections.length) log(detections);

    return {
        system: `${system.trim()}\n\n${CONTAINMENT_RULE}`,
        values,
        detections,
    };
}

export function envelope(input: EnvelopeInput): Envelope {
    const nonce = randomBytes(5).toString('hex');
    const detections: Detection[] = [];

    const blocks = Object.entries(input.untrusted).map(([field, raw]) => {
        // Detect on the raw text, not the cleaned text — neutralise() strips the
        // invisible characters, so detecting afterwards would report every
        // zero-width payload as clean.
        detections.push(...detect(field, raw ?? ''));
        const value = neutralise(raw ?? '');

        // Belt and braces: a payload that somehow contains the nonce cannot use
        // it to close its own block.
        const safe = value.split(`data-${nonce}`).join('data-redacted');

        return `<data-${nonce} field="${field}">\n${safe}\n</data-${nonce}>`;
    });

    if (detections.length) log(detections);

    const user = [input.instruction?.trim(), ...blocks].filter(Boolean).join('\n\n');

    return {
        system: `${input.system.trim()}\n\n${CONTAINMENT_RULE}`,
        user,
        detections,
    };
}
