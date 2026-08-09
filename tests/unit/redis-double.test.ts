import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { redisStub } from '../support/redis-mock';

const LIMITS_DIR = join(process.cwd(), 'src/lib/limits');

function methodsCalledInSource(): string[] {
    const found = new Set<string>();

    for (const file of readdirSync(LIMITS_DIR).filter((f) => f.endsWith('.ts'))) {
        const source = readFileSync(join(LIMITS_DIR, file), 'utf8');
        for (const match of source.matchAll(/redis\(\)\.(\w+)/g)) found.add(match[1]);
    }

    return [...found].sort();
}

describe('redis test double', () => {
    it('covers every method src/lib/limits calls', () => {
        const used = methodsCalledInSource();
        expect(used.length).toBeGreaterThan(0);
        expect(used.filter((m) => !(m in redisStub))).toEqual([]);
    });
});
