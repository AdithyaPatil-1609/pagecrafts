import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { promptQuery } from '@/lib/hero-prompt';

// Somebody who has never signed up types what their shop does and presses Build it. They
// should land on the describe screen with their words already in it — not on a sign-in wall
// that asks them to commit before they have seen anything.
//
// Sign-in comes later, when there is a real site to attach to an account, and IntentCapture
// keeps the brief in sessionStorage across it so nothing is typed twice.
//
// This reads the source because the thing worth protecting is a destination, and the
// regression it guards against was a Build it that pointed at /templates.

const hero = readFileSync('src/components/landing/HeroPrompt.tsx', 'utf8');

describe('Build it goes to the describe screen', () => {
    it('pushes /new with the words carried along', () => {
        expect(hero).toContain('router.push(`/new?q=${encodeURIComponent(q)}`)');
    });

    it('sends nobody to sign-in or sign-up from the hero', () => {
        expect(hero).not.toMatch(/\/signin|\/signup/);
    });

    // The old landing sent Build it straight to the template gallery, which asked for an
    // account before anyone had described anything.
    it('does not shortcut to the template gallery', () => {
        expect(hero).not.toContain('/templates');
    });

    // The typewriter makes the field read as a caption, so Enter alone is not discoverable.
    it('offers a button, not only the Enter key', () => {
        expect(hero).toMatch(/<button[^>]*type="submit"/);
        expect(hero).toContain('Build it');
    });
});

describe('what gets carried to the describe screen', () => {
    it('prefers what the visitor typed', () => {
        expect(promptQuery('a sweet shop in Indiranagar', 'a baker')).toBe(
            'a sweet shop in Indiranagar',
        );
    });

    // An empty box on submit means they liked the example enough to press the button.
    it('falls back to the example on screen', () => {
        expect(promptQuery('', 'a baker')).toBe('a baker');
        expect(promptQuery('   ', 'a yoga studio')).toBe('a yoga studio');
    });
});
