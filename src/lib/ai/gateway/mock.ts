import type { CompleteReply } from './provider';

const FIXTURES: Record<string, unknown> = {
    'photography studio': {
        category: 'portfolio',
        vertical: 'photography',
        tone: 'minimal',
        palette: 'dark',
        sections: ['hero', 'gallery', 'about', 'contact'],
    },
    'dental clinic': {
        category: 'other',
        vertical: 'dental-clinic',
        tone: 'formal',
        palette: 'light',
        sections: ['hero', 'services', 'team', 'faq', 'contact'],
    },
    bakery: {
        category: 'restaurant',
        vertical: 'bakery',
        tone: 'warm',
        palette: 'light',
        sections: ['hero', 'menu', 'gallery', 'contact'],
    },
};

const DEFAULT = {
    category: 'other',
    vertical: 'general-business',
    tone: 'minimal',
    palette: 'light',
    sections: ['hero', 'about', 'contact'],
};

function match(text: string): unknown {
    const lower = text.toLowerCase();
    const key = Object.keys(FIXTURES).find((k) => lower.includes(k));
    return key ? FIXTURES[key] : DEFAULT;
}

export class MockGateway {
    constructor(private readonly mode: 'ok' | 'error' | 'garbage' = 'ok') { }

    async complete({ user }: { user: string }): Promise<CompleteReply> {
        if (this.mode === 'error') throw new Error('mock provider unreachable');

        const text = this.mode === 'garbage'
            ? 'sorry, I cannot help with that'
            : JSON.stringify(match(user));

        return { text, model: 'mock', inputTokens: 12, outputTokens: 24, latencyMs: 3 };
    }
}