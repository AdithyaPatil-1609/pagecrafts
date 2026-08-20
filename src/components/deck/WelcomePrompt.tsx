"use client";

import { ArrowRight } from "lucide-react";

import {
    FIRST_PROMPT,
    TypewriterLine,
    usePrefersReducedMotion,
    useTypewriterLoop,
} from "@/components/landing/prompt-typewriter";

/** Display-only prompt graphic. Not an input. Only Build it is interactive. */
export function WelcomePrompt() {
    const reduce = usePrefersReducedMotion();
    const { shown } = useTypewriterLoop(!reduce);
    const text = reduce ? FIRST_PROMPT : shown;

    return (
        <div className="hero-prompt welcome-prompt pointer-events-none">
            <span className="text-bloom-sky" aria-hidden>
                <ArrowRight className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1" aria-hidden>
                <TypewriterLine text={text} />
            </div>
            <a href="#build" className="welcome-prompt-cta">
                Build it →
            </a>
        </div>
    );
}
