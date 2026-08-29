"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { promptQuery } from "@/lib/hero-prompt";
import {
    FIRST_PROMPT,
    TypewriterLine,
    usePrefersReducedMotion,
    useTypewriterLoop,
} from "@/components/landing/prompt-typewriter";

export function HeroPrompt() {
    const router = useRouter();
    const reduce = usePrefersReducedMotion();
    const [value, setValue] = useState("");
    const [focused, setFocused] = useState(false);

    const looping = !reduce && !focused && value.length === 0;
    const { shown, phrase } = useTypewriterLoop(looping);

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const q = promptQuery(value, phrase);
        router.push(`/new?q=${encodeURIComponent(q)}`);
    }

    return (
        <form onSubmit={submit} className="hero-prompt">
            <span className="text-bloom-sky" aria-hidden>
                <ArrowRight className="size-4" strokeWidth={2} />
            </span>
            <div className="relative min-w-0 flex-1">
                <input
                    name="q"
                    type="text"
                    maxLength={MAX_CLASSIFY_CHARS}
                    placeholder={looping ? undefined : FIRST_PROMPT}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onFocus={() => {
                        setFocused(true);
                        setValue((current) => current || shown);
                    }}
                    onBlur={() => setFocused(false)}
                    aria-label="Describe the site you want"
                    className="relative z-[1] min-w-0 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
                    autoComplete="off"
                />
                {looping ? (
                    <span className="pointer-events-none absolute inset-0 z-[2] flex items-center">
                        <TypewriterLine text={shown} />
                    </span>
                ) : null}
            </div>
            {/*
             * The landing page keeps its button. The signed-in welcome slide does not — that
             * one was asked to go, and this is the one that has to stay: a first-time visitor
             * reading the headline needs something to press, and the typewriter makes the
             * field read as a caption rather than an input.
             *
             * Submits the same form: describe first at /new, sign in only when there is a
             * site to save.
             */}
            <button type="submit" className="hero-prompt-cta">
                Build it →
            </button>
        </form>
    );
}
