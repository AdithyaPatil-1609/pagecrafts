/**
 * Build draft compositions for the catalogue (TC-125, TC-131).
 *
 * Resumable: a vertical whose draft already exists is skipped.
 *
 *   npx tsx scripts/build-catalogue.ts
 *
 * Uses the mock gateway unless AI keys are configured. Writes
 * evals/catalogue/drafts/<vertical>.json
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setGateway } from '../src/lib/ai/gateway';
import { MockGateway } from '../src/lib/ai/gateway/mock';
import { Budget, generateSpike } from '../evals/spike/pipeline';

const ROOT = join(process.cwd(), 'evals/catalogue/drafts');

function verticals(): string[] {
    const corpus = JSON.parse(
        readFileSync(join(process.cwd(), 'evals/corpus-30.json'), 'utf8'),
    ) as Array<{ vertical: string }>;
    return [...new Set(corpus.map((c) => c.vertical))];
}

async function main(): Promise<void> {
    mkdirSync(ROOT, { recursive: true });
    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
        setGateway(new MockGateway());
    }

    const list = verticals();
    console.log(`catalogue: ${list.length} verticals`);

    for (const vertical of list) {
        const dest = join(ROOT, `${vertical}.json`);
        if (existsSync(dest)) {
            console.log(`  skip ${vertical}`);
            continue;
        }

        const result = await generateSpike({
            vertical,
            prompt: `a website for a ${vertical.replace(/-/g, ' ')}`,
            hasTemplate: false,
            mode: process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY ? 'full' : 'mock',
            budget: new Budget(50),
        });

        if (!result.ok || !result.composition) {
            console.warn(`  fail ${vertical}: ${result.error ?? 'no composition'}`);
            continue;
        }

        writeFileSync(dest, `${JSON.stringify(result.composition, null, 2)}\n`);
        console.log(`  wrote ${vertical}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
