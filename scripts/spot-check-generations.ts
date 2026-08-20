/**
 * Live spot-check: generate a handful of real briefs, restyle them into the
 * three looks, and fail if copy or motion drifts off the business.
 *
 *   npx tsx --env-file=.env.local scripts/spot-check-generations.ts
 */
import { generateSpike, Budget } from '../evals/spike/pipeline';
import { buildStyleOptions } from '@/lib/ai/generate/options';
import { motifFor } from '@/lib/ai/generate/motion-motif';
import type { Composition } from '@/lib/contracts';

interface Case {
    id: string;
    prompt: string;
    motif: ReturnType<typeof motifFor>;
    must: string[];
    forbid: string[];
}

const CASES: Case[] = [
    {
        id: 'dental-clinic',
        prompt: 'a website for my family dental clinic in koramangala, we do check-ups root canals and braces, people should be able to book an appointment',
        motif: 'tooth',
        must: ['koramangala'],
        forbid: ['jalebi', 'mithai', 'saree'],
    },
    {
        id: 'gym',
        prompt: 'bold loud page for a boutique gym, big pictures, class packages and pricing, open till 11pm',
        motif: 'flame',
        must: ['gym'],
        forbid: ['jalebi', 'root canal', 'saree'],
    },
    {
        id: 'restaurant',
        prompt: 'warm friendly site for my small south indian breakfast place in jayanagar, with the menu and timings',
        motif: 'steam',
        must: ['jayanagar'],
        forbid: ['braces', 'saree', 'root canal'],
    },
    {
        id: 'bakery',
        prompt: 'small home bakery in indiranagar, we do custom birthday cakes brownies and cupcakes, want people to whatsapp me orders',
        motif: 'jalebi',
        must: ['indiranagar'],
        forbid: ['braces', 'koramangala'],
    },
    {
        id: 'plumber',
        prompt: "i'm a plumber in pune doing emergency callouts leak repairs and bathroom fittings, need my number big on the page and 24/7 mentioned",
        motif: 'none',
        must: ['pune'],
        forbid: ['jalebi', 'braces', 'saree'],
    },
];

function flatten(composition: Composition): string {
    return JSON.stringify(composition).toLowerCase();
}

async function main(): Promise<void> {
    const budget = new Budget(80);
    const failures: string[] = [];

    for (const c of CASES) {
        process.stdout.write(`\n▸ ${c.id} … `);
        const result = await generateSpike({
            vertical: c.id,
            prompt: c.prompt,
            hasTemplate: false,
            mode: 'full',
            budget,
            profileFrom: 'classified',
        });

        if (!result.ok || !result.composition) {
            const msg = `${c.id}: generation failed — ${result.error ?? 'no composition'}`;
            failures.push(msg);
            console.log(`FAIL  ${result.error ?? 'no composition'}`);
            continue;
        }

        const composition = result.composition;
        const text = flatten(composition);
        const classified = composition.vertical;
        const picked = motifFor(classified, `${composition.meta.title} ${composition.meta.description} ${c.prompt}`);
        const options = await buildStyleOptions(composition);
        const html = Object.fromEntries(options.map((o) => [o.id, o.files['index.html'] ?? '']));

        const notes: string[] = [];
        notes.push(`vertical=${classified}`);
        notes.push(`motif=${picked}`);
        notes.push(`sections=${composition.sections.map((s) => s.type).join(',')}`);
        notes.push(`hero=${String(composition.sections.find((s) => s.type === 'hero')?.props.heading ?? '')}`);

        if (picked !== c.motif) {
            failures.push(`${c.id}: expected motif ${c.motif}, got ${picked} (vertical ${classified})`);
        }
        for (const word of c.must) {
            if (!text.includes(word.toLowerCase()) && !(html.motion ?? '').toLowerCase().includes(word.toLowerCase())) {
                failures.push(`${c.id}: missing ${JSON.stringify(word)}`);
            }
        }
        for (const word of c.forbid) {
            if (text.includes(word.toLowerCase())) {
                failures.push(`${c.id}: leaked ${JSON.stringify(word)}`);
            }
        }
        if (!(html.casual ?? '').includes('data-style="casual"')) failures.push(`${c.id}: casual look missing`);
        if (!(html.photos ?? '').includes('data-style="photos"')) failures.push(`${c.id}: photo look missing`);
        if (!(html.motion ?? '').includes('data-style="motion"')) failures.push(`${c.id}: motion look missing`);
        if (!(html.motion ?? '').includes('motion-stage')) failures.push(`${c.id}: premium canvas missing`);
        if ((html.casual ?? '').includes('motion-stage')) failures.push(`${c.id}: motion leaked into casual`);
        if ((html.photos ?? '').includes('class="motion-motif"')) failures.push(`${c.id}: motif leaked into photos`);
        if (c.motif !== 'none' && !(html.motion ?? '').includes(`data-motif="${c.motif}"`)) {
            failures.push(`${c.id}: motion HTML missing data-motif=${c.motif}`);
        }
        if (c.motif === 'none' && (html.motion ?? '').includes('class="motion-motif"')) {
            failures.push(`${c.id}: unexpected motif on unmapped trade`);
        }

        const failedHere = failures.filter((f) => f.startsWith(`${c.id}:`));
        console.log(failedHere.length ? `FAIL  ${notes.join(' · ')}` : `ok    ${notes.join(' · ')}`);
        for (const f of failedHere) console.log(`      ${f.slice(c.id.length + 2)}`);
    }

    console.log('');
    if (failures.length) {
        console.error(`\n${failures.length} check(s) failed.`);
        process.exit(1);
    }
    console.log(`All ${CASES.length} live generations stayed on-brief.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
