import { runPrompt } from './runner';
import { listTemplates } from './templates';
import { SECTION_KEYS } from '@/lib/contracts';
import { config } from 'dotenv';
config({ path: '.env.local' });

const DEFAULTS: Record<string, string> = {
    categories: 'restaurant, portfolio, saas, event, personal, shop, blog, other',
    tones: 'playful, formal, minimal, bold, warm',
    palettes: 'light, dark, colourful, muted',
    sectionKeys: SECTION_KEYS.join(', '),
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