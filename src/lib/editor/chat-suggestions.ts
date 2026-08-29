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
            { id: 'headline', label: 'Rewrite the headline', send: 'Rewrite the headline for this business to be clear and catchy' },
            { id: 'bg-photo', label: 'Change background photo', send: 'Suggest a better background photo for this website' },
            { id: 'warmer', label: 'Make the text friendly', send: 'Make the words friendly and easy to read' },
            { id: 'phone', label: 'Add contact details', send: 'Add contact details and phone number clearly on the page' },
        ];
        if (last) {
            next.push({ id: 'keep-going', label: 'Keep going with my last instruction', send: last });
        } else {
            next.push({ id: 'describe', label: 'Describe a change', compose: true });
        }
        return next.slice(0, 5);
    }

    if (sections.length === 0) {
        return [
            { id: 'sweet-shop', label: 'Create a sweet shop website' },
            { id: 'clinic', label: 'Create a family clinic website' },
            { id: 'restaurant', label: 'Create a modern restaurant website' },
            { id: 'describe', label: 'Describe the website you want', compose: true },
        ];
    }

    const next: ChatSuggestion[] = [];

    if (types.has('hero')) {
        next.push({
            id: 'hero-headline',
            label: 'Sharpen the headline',
            send: 'Rewrite the main headline so it clearly states the business and what it offers',
        });
        next.push({
            id: 'bg-photo',
            label: 'Change background photo',
            send: 'Update the hero background photo to something more striking',
        });
    }

    next.push({
        id: 'warmer',
        label: 'Make the copy warmer',
        send: 'Make the copy warmer and more personal, keeping every fact exactly as it is',
    });

    if (last) {
        next.push({
            id: 'keep-going',
            label: 'Keep going with my last instruction',
            send: last,
        });
    }

    if (types.has('menu') || types.has('services')) {
        next.push({
            id: 'offerings',
            label: 'Improve services list',
            send: 'Give each item on the list a clearer and more engaging description',
        });
    }

    if (types.has('contact')) {
        next.push({
            id: 'contact-clear',
            label: 'Make contact info clear',
            send: 'Make the opening hours and contact methods clear and easy to find',
        });
    }

    if (next.length < 5) {
        next.push({ id: 'new-site', label: 'Start a whole new website' });
    }

    return next.slice(0, 5);
}
