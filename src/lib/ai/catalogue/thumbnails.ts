import type { Composition } from '@/lib/contracts';

const THEME_FILL: Record<string, string> = {
    'clinical-blue': '#dbeafe',
    'warm-editorial': '#ffedd5',
    'deep-luxury': '#1e1b4b',
    'vivid-energy': '#fee2e2',
    'calm-sage': '#dcfce7',
    'mono-precision': '#e5e7eb',
    'sunlit-craft': '#fef9c3',
    'tech-slate': '#e2e8f0',
};

export interface ThumbnailSize {
    width: number;
    height: number;
}

export const DESKTOP: ThumbnailSize = { width: 1280, height: 800 };
export const MOBILE: ThumbnailSize = { width: 390, height: 844 };

/** Deterministic SVG for a composition. Re-runs are byte-identical (TC-126). */
export function compositionThumbnail(composition: Composition, size: ThumbnailSize): string {
    const fill = THEME_FILL[composition.artDirection.themeId] ?? '#f4f4f5';
    const bands = composition.sections.map((section, i) => {
        const y = Math.round((i / Math.max(composition.sections.length, 1)) * size.height);
        const h = Math.round(size.height / Math.max(composition.sections.length, 1));
        return `<rect x="0" y="${y}" width="${size.width}" height="${h}" fill="${i % 2 === 0 ? fill : '#ffffff'}"/>`
            + `<text x="24" y="${y + Math.min(40, h - 8)}" font-size="18" font-family="sans-serif">${escapeXml(section.type)}</text>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>\n`
        + `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">`
        + `<rect width="100%" height="100%" fill="${fill}"/>`
        + bands
        + `<text x="24" y="${size.height - 24}" font-size="14" font-family="sans-serif">${escapeXml(composition.vertical)}</text>`
        + `</svg>\n`;
}

function escapeXml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
