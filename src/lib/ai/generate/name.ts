const MAX_NAME = 80;

/** A project name the dashboard can show before generation finishes. */
export function projectNameFromPrompt(prompt: string): string {
    const text = prompt.trim().replace(/\s+/g, ' ');
    if (!text) return 'New website';

    const capped = text.charAt(0).toUpperCase() + text.slice(1);
    if (capped.length <= MAX_NAME) return capped;
    return `${capped.slice(0, MAX_NAME - 1).trimEnd()}…`;
}
