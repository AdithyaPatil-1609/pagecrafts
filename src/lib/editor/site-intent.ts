/** Whole-site requests vs a change to the selected section. */

const SITE_REQUEST =
    /\b((create|build|make|generate|design|start|draft|rebuild|replace)\b[\s\S]{0,120}\b(website|web site|site|landing page|homepage|home page|web page|page)\b)|(\b(website|web site|landing page|homepage)\b[\s\S]{0,60}\b(for|about)\b)/i;

export function isSiteGenerationRequest(prompt: string, sectionCount: number): boolean {
    if (sectionCount <= 0) return true;
    return SITE_REQUEST.test(prompt.trim());
}
