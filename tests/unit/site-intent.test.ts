import { describe, expect, it } from 'vitest';
import { isSiteGenerationRequest } from '@/lib/editor/site-intent';

describe('isSiteGenerationRequest', () => {
    it('treats an empty page as a site request', () => {
        expect(isSiteGenerationRequest('a quiet bakery', 0)).toBe(true);
        expect(isSiteGenerationRequest('Make the heading shorter', 0)).toBe(true);
    });

    it('recognises create-a-website prompts on an existing page', () => {
        expect(isSiteGenerationRequest('Create a sweet shop website', 3)).toBe(true);
        expect(isSiteGenerationRequest('Create a portfolio website for a photographer', 3)).toBe(true);
        expect(isSiteGenerationRequest('Create a restaurant website', 2)).toBe(true);
        expect(isSiteGenerationRequest('Create a gym landing page', 4)).toBe(true);
    });

    it('leaves section edits on an existing page', () => {
        expect(isSiteGenerationRequest('Make the heading shorter', 3)).toBe(false);
        expect(isSiteGenerationRequest('Change the button label', 1)).toBe(false);
    });

    it('treats a new-site brief as generation, not a template tweak', () => {
        expect(isSiteGenerationRequest('I want a bakery in Bangalore with a menu and a contact form', 3)).toBe(true);
        expect(isSiteGenerationRequest('Build me a gym for Iron Hall with class times', 4)).toBe(true);
        expect(isSiteGenerationRequest('Generate a photographer portfolio with selected work', 2)).toBe(true);
    });
});
