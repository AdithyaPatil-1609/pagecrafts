import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface PromptTemplate {
    id: string;
    version: string;
    tier: 'fast' | 'strong';
    system: string;
    user: string;
}

const DIR = join(process.cwd(), 'src/lib/ai/harness/prompts');

function parse(raw: string, file: string): PromptTemplate {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`${file}: missing --- front matter block.`);

    const meta = Object.fromEntries(
        match[1].split('\n').map((line) => {
            const [k, ...rest] = line.split(':');
            return [k.trim(), rest.join(':').trim()];
        }),
    );

    const body = match[2];
    const systemAt = body.indexOf('SYSTEM');
    const userAt = body.indexOf('USER');
    if (systemAt === -1 || userAt === -1) throw new Error(`${file}: needs SYSTEM and USER.`);

    return {
        id: meta.id,
        version: meta.version,
        tier: meta.tier === 'fast' ? 'fast' : 'strong',
        system: body.slice(systemAt + 'SYSTEM'.length, userAt).trim(),
        user: body.slice(userAt + 'USER'.length).trim(),
    };
}

export function listTemplates(): string[] {
    return readdirSync(DIR).filter((f) => f.endsWith('.md'));
}

export function loadTemplate(name: string): PromptTemplate {
    const file = name.endsWith('.md') ? name : `${name}.md`;
    return parse(readFileSync(join(DIR, file), 'utf8'), file);
}

export function render(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
        if (!(key in vars)) throw new Error(`Prompt variable "${key}" was not supplied.`);
        return vars[key];
    });
}