import type { Composition } from '@/lib/contracts';

export interface ChatSuggestion {
    id: string;
    label: string;
    /** Sent to Ask. Defaults to `label`. */
    send?: string;
    /** Focus the compose box instead of sending. */
    compose?: boolean;
}

/**
 * Choices the person can tap instead of typing — the replacement for a field list.
 * Empty sites get starters; a built site gets follow-ups from what is on the page.
 */
export function chatSuggestions(input: {
    composition: Composition | null;
    lastUserText?: string | null;
    hasPage?: boolean;
}): ChatSuggestion[] {
    const sections = input.composition?.sections ?? [];
    const types = new Set(sections.map((section) => section.type));
    const last = input.lastUserText?.trim() ?? '';

    if (sections.length === 0 && input.hasPage) {
        const next: ChatSuggestion[] = [
            { id: 'headline', label: 'Rewrite the headline', send: 'Rewrite the headline for this business' },
            { id: 'warmer', label: 'Make the copy warmer', send: 'Make the copy warmer and more personal' },
            { id: 'phone', label: 'Put the phone on the page', send: 'Put the phone number on the page if we have it' },
        ];
        if (last) {
            next.push({ id: 'keep-going', label: 'Keep going with my last instruction', send: last });
        } else {
            next.push({ id: 'describe', label: 'Describe a change', compose: true });
        }
        return next.slice(0, 4);
    }

    if (sections.length === 0) {
        return [
            { id: 'sweet-shop', label: 'Create a sweet shop website' },
            { id: 'clinic', label: 'Create a family clinic website' },
            { id: 'describe', label: 'Describe the website you want', compose: true },
        ];
    }

    const next: ChatSuggestion[] = [];

    if (types.has('hero')) {
        next.push({ id: 'hero-graphical', label: 'Make the hero more graphical' });
    }

    next.push({ id: 'slide-through', label: 'Use a slide-through layout' });

    if (last) {
        next.push({
            id: 'keep-going',
            label: 'Keep going with my last instruction',
            send: last,
        });
    }

    if (types.has('menu') || types.has('services')) {
        next.push({ id: 'offerings', label: 'Make the list of offerings richer' });
    }

    if (next.length < 4) {
        next.push({ id: 'new-site', label: 'Start a whole new website' });
    }

    return next.slice(0, 4);
}
