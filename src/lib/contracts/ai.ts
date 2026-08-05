export type { Category } from './template';

export type Tone = 'playful' | 'formal' | 'minimal' | 'bold' | 'warm';
export type Palette = 'light' | 'dark' | 'colourful' | 'muted';

export const SECTION_KEYS = [
    'hero', 'about', 'services', 'menu', 'gallery', 'testimonials', 'contact', 'footer',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface IntentAttributes {
    category: Category;
    tone: Tone;
    palette: Palette;
    sections: SectionKey[];
    fallback: boolean;
}

export interface PlannedSection {
    key: SectionKey;
    intent: string;
    fields: string[];
}

export interface SitePlan {
    sections: PlannedSection[];
}

export interface FilledSection {
    key: SectionKey;
    html: string;
}

export interface EditProposal {
    diff: string;
    proposedContent: string;
    applied: false;
}

export interface Usage {
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
}

export interface AiResult<T> {
    data: T;
    usage: Usage;
}