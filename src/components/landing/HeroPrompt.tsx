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

const CTA =
    "shrink-0 cursor-pointer rounded-full bg-bloom-blue px-5 py-2 text-sm font-semibold text-background shadow-[0_0_28px_color-mix(in_srgb,var(--bloom-blue)_45%,transparent)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bloom-sky";

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
            <button type="submit" className={CTA}>
                Build it
            </button>
        </form>
    );
}
