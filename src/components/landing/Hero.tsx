import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { HeroPrompt } from "@/components/landing/HeroPrompt";

export function Hero() {
    return (
        <section data-reveal className="flex flex-col">
            <p className="glass-pill mb-6 w-fit font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
                No code needed. Just your words.
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                <span className="text-foreground">Say it. </span>
                <span className="text-bloom-sky">See it </span>
                <span className="hero-gold">built.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                Tell us about your business. We will build a real website for you — you can
                watch it come together on your screen.
            </p>

            <div className="mt-9 max-w-xl">
                <HeroPrompt />
            </div>

            <Link
                href="/templates"
                className={buttonVariants({
                    variant: "outline-brand",
                    size: "lg",
                    className: "mt-5 w-fit rounded-full font-semibold",
                })}
            >
                Build it
                <ArrowRight aria-hidden />
            </Link>
        </section>
    );
}

