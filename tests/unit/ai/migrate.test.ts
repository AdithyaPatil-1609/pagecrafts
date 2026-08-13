import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateComposition, MigrationError } from '@/lib/ai/composition/migrate';
import { SCHEMA_VERSION } from '@/lib/contracts';

const fixture = (name: string) =>
    JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/compositions', name), 'utf8'));

describe('migrateComposition (TC-128)', () => {
    it('upgrades a v2 composition to the current schema', () => {
        const next = migrateComposition(fixture('v2.json'));
        expect(next.schemaVersion).toBe(SCHEMA_VERSION);
        expect(next.vertical).toBe('dental-clinic');
        expect(next.artDirection.themeId).toBe('clinical-blue');
        expect(next.sections[0].visible).toBe(true);
        expect(next.sections[0].source).toBe('ai');
        expect(next.meta.title).toBe('Smile Dental');
    });

    it('is a no-op on a current v3 composition', () => {
        const v3 = fixture('v3.json');
        expect(migrateComposition(v3)).toEqual(v3);
    });

    it('refuses a future schema version rather than guessing', () => {
        expect(() => migrateComposition({ ...fixture('v3.json'), schemaVersion: 99 }))
            .toThrow(MigrationError);
    });

    it('refuses a value that is not an object', () => {
        expect(() => migrateComposition('not a composition')).toThrow(MigrationError);
    });
});
