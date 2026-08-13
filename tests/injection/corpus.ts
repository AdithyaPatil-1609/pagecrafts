import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export type Family = 'direct-override' | 'encoded' | 'content-embedded' | 'multi-turn';

export interface Turn {
    instruction: string;
    payload: string;
    note?: string;
}

export interface InjectionCase {
    id: string;
    family: Family;
    stage: 'generate' | 'edit';
    /** Single-turn cases carry these two directly. */
    payload?: string;
    instruction?: string;
    /** Multi-turn cases carry a sequence instead. */
    turns?: Turn[];
    field?: string;
    note?: string;
    expect: {
        /**
         * The row people forget. A model that refuses everything passes every
         * injection test and is useless — containment means the real
         * instruction still works while the payload does not.
         */
        instructionFollowed: boolean;
        payloadIgnored: boolean;
        /** Whether a detector should fire. Not every attack is a phrase match. */
        detected: boolean;
        sectionsRemoved: number;
        storedFreeOfActiveContent?: boolean;
    };
}

const DIR = join(process.cwd(), 'tests/injection/corpus');

export function loadInjectionCorpus(): InjectionCase[] {
    return readdirSync(DIR)
        .filter((f) => f.endsWith('.json'))
        .flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as InjectionCase[])
        .sort((a, b) => a.id.localeCompare(b.id));
}

/** The payload a case delivers — the last turn's, for a multi-turn case. */
export function payloadOf(c: InjectionCase): string {
    if (c.turns?.length) return c.turns[c.turns.length - 1].payload;
    return c.payload ?? '';
}

/** The real instruction the user gave — the one that must still be carried out. */
export function instructionOf(c: InjectionCase): string {
    if (c.turns?.length) return c.turns[c.turns.length - 1].instruction;
    return c.instruction ?? '';
}
