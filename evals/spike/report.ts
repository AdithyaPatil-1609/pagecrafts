import type { Composition } from '@/lib/contracts';
import type { SpikeResult } from './pipeline';

function renderValue(value: unknown, indent = ''): string {
    if (typeof value === 'string') return `${indent}${value}`;
    if (Array.isArray(value)) {
        return value
            .map((v, i) => `${indent}${i + 1}. ${renderValue(v, '').replace(/\n/g, ' · ')}`)
            .join('\n');
    }
    if (value && typeof value === 'object') {
        return Object.entries(value)
            .map(([k, v]) => `${indent}**${k}:** ${renderValue(v, '')}`)
            .join('\n');
    }
    return `${indent}${String(value)}`;
}

function renderComposition(c: Composition): string {
    const ad = c.artDirection;

    const head = [
        `### Art direction`,
        '',
        `theme **${ad.themeId}** · motion **${ad.motionId}** · corners **${ad.radiusId}** · `
        + `spacing **${ad.spacingId}** · imagery **${ad.imageryId}**`,
        '',
        `### Sections (${c.sections.length})`,
        '',
        c.sections.map((s, i) => `${i + 1}. \`${s.type}\` / \`${s.variant}\` — ${s.brief}`).join('\n'),
        '',
    ].join('\n');

    const body = c.sections
        .map((s) => {
            const props = Object.keys(s.props).length
                ? Object.entries(s.props)
                    .map(([k, v]) => `**${k}**\n\n${renderValue(v)}`)
                    .join('\n\n')
                : '_(plan-only — not filled)_';
            return `---\n\n### ${s.type} · ${s.variant}\n\n${props}\n`;
        })
        .join('\n');

    return `${head}\n${body}`;
}

export function reportFor(r: SpikeResult): string {
    const header = [
        `# ${r.vertical}`,
        '',
        `> ${r.prompt}`,
        '',
        `**Template exists:** ${r.hasTemplate ? 'yes' : '**no**'} · `
        + `**Mode:** ${r.mode} · **Requests:** ${r.requests} · `
        + `**Model time:** ${(r.modelTimeMs / 1000).toFixed(1)}s · `
        + `**Wall clock:** ${(r.wallClockMs / 1000).toFixed(1)}s`,
        '',
    ].join('\n');

    if (!r.ok) return `${header}\n## FAILED\n\n\`\`\`\n${r.error}\n\`\`\`\n`;
    if (!r.composition) return `${header}\n_(no composition)_\n`;

    return `${header}${renderComposition(r.composition)}`;
}

export function indexFor(results: SpikeResult[]): string {
    const rows = results.map((r) => {
        const sections = r.composition?.sections.length ?? 0;
        const theme = r.composition?.artDirection.themeId ?? '—';
        const motion = r.composition?.artDirection.motionId ?? '—';
        return `| ${r.vertical} | ${r.hasTemplate ? 'yes' : '**no**'} | ${r.ok ? 'ok' : 'FAILED'} `
            + `| ${sections} | ${theme} | ${motion} | ${r.requests} `
            + `| ${(r.modelTimeMs / 1000).toFixed(1)}s |`;
    });

    return [
        '# Spike results',
        '',
        '| Vertical | Template | Result | Sections | Theme | Motion | Reqs | Model time |',
        '|---|---|---|---|---|---|---|---|',
        ...rows,
        '',
    ].join('\n');
}