/** Whole-site requests vs a change to the selected section. */

const SITE_REQUEST =
    /\b((create|build|make|generate|design|start|draft|rebuild|replace)\b[\s\S]{0,120}\b(website|web site|site|landing page|homepage|home page|web page|page)\b)|(\b(website|web site|landing page|homepage)\b[\s\S]{0,60}\b(for|about)\b)/i;

const SECTION_TWEAK =
    /\b(heading|headline|subhead|sub-?heading|button|label|this section|that section|this copy|the copy|colour|color|rewrite this|shorter|longer)\b/i;

const NEW_SITE_BRIEF =
    /\b(create|build|make|generate|design|start|draft|rebuild|replace|i want|i need)\b/i;

export function isSiteGenerationRequest(prompt: string, sectionCount: number): boolean {
    const text = prompt.trim();
    if (sectionCount <= 0) return true;
    if (SITE_REQUEST.test(text)) return true;
    if (SECTION_TWEAK.test(text)) return false;
    return NEW_SITE_BRIEF.test(text) && text.length >= 18;
}
