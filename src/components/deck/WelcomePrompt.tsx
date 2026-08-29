"use client";

import { ArrowRight } from "lucide-react";

import {
    FIRST_PROMPT,
    TypewriterLine,
    usePrefersReducedMotion,
    useTypewriterLoop,
} from "@/components/landing/prompt-typewriter";

/**
 * Display-only prompt graphic on the signed-in welcome slide. Not an input, and no longer a
 * button either — it is a picture of the thing, shown above the fold to say what this is.
 *
 * The Build it link that used to sit on the right was asked to go. Somebody who is already
 * signed in reaches the build slide by scrolling or by the slide nav; the welcome slide is
 * an opening, not a decision.
 */
export function WelcomePrompt() {
    const reduce = usePrefersReducedMotion();
    const { shown } = useTypewriterLoop(!reduce);
    const text = reduce ? FIRST_PROMPT : shown;

    return (
        <div className="hero-prompt welcome-prompt pointer-events-none" aria-hidden>
            <span className="text-bloom-sky">
                <ArrowRight className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
                <TypewriterLine text={text} />
            </div>
        </div>
    );
}
