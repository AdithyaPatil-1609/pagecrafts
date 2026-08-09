import { runPrompt } from './runner';
import { listTemplates } from './templates';
import { config } from 'dotenv';
config({ path: '.env.local' });

import {
    SECTION_KEYS, THEME_IDS, MOTION_IDS,
    RADIUS_IDS, SPACING_IDS, IMAGERY_IDS,
} from '@/lib/contracts';
import { CATEGORY_LIST } from '../schemas';
import { variantMenu } from '../sections/contracts';

const DEFAULTS: Record<string, string> = {
    categories: CATEGORY_LIST,
    sectionKeys: SECTION_KEYS.join(', '),
    variantMenu: variantMenu(),
    themes: THEME_IDS.join(', '),
    motions: MOTION_IDS.join(', '),
    radii: RADIUS_IDS.join(', '),
    spacings: SPACING_IDS.join(', '),
    imagery: IMAGERY_IDS.join(', '),
    tone: 'minimal',
    variant: 'default',
    customerWord: 'customer',
    fields: 'heading, sub',
    recipe: '(none)',
    brief: '(none)',
};

function parseArgs(argv: string[]) {
    const [template, ...rest] = argv;
    const vars = { ...DEFAULTS };
    for (const arg of rest) {
        const at = arg.indexOf('=');
        if (at > 0) vars[arg.slice(0, at)] = arg.slice(at + 1);
    }
    return { template, vars };
}

async function main() {
    const { template, vars } = parseArgs(process.argv.slice(2));

    if (!template) {
        console.log('Usage: npm run prompt -- <template> key=value ...');
        console.log('Templates:', listTemplates().join(', '));
        process.exit(1);
    }

    const result = await runPrompt({ template, vars });

    console.log(`\n--- ${result.templateId} ${result.templateVersion} · ${result.model}`);
    console.log(result.output);
    console.log(
        `--- ${result.inputTokens} in / ${result.outputTokens} out · ${result.latencyMs}ms\n`,
    );
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});