"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
    PROMPT_PHRASES,
    currentPhrase,
    initialTypewriter,
    stepTypewriter,
    typedPrompt,
    typewriterDelay,
    type TypewriterState,
} from "@/lib/hero-prompt";

function motionPreference() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion() {
    return useSyncExternalStore(
        (notify) => {
            const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
            mq.addEventListener("change", notify);
            return () => mq.removeEventListener("change", notify);
        },
        motionPreference,
        () => true,
    );
}

export const FIRST_PROMPT = PROMPT_PHRASES[0] ?? "";

export function useTypewriterLoop(active: boolean) {
    const [frame, setFrame] = useState<TypewriterState>(initialTypewriter);

    useEffect(() => {
        if (!active) return;
        const timer = window.setTimeout(() => {
            setFrame((prev) => stepTypewriter(prev));
        }, typewriterDelay(frame));
        return () => window.clearTimeout(timer);
    }, [active, frame]);

    return { shown: typedPrompt(frame), phrase: currentPhrase(frame) };
}

export function TypewriterLine({ text }: { text: string }) {
    return (
        <span
            aria-hidden
            className="hero-prompt-line pointer-events-none flex min-h-[1.25rem] min-w-0 select-none items-center overflow-hidden font-mono text-sm text-muted-foreground/80"
        >
            <span className="truncate">{text}</span>
            <span className="hero-prompt-caret">|</span>
        </span>
    );
}
