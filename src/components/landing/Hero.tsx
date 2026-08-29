import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { HeroPrompt } from "@/components/landing/HeroPrompt";

/*
  Hero (R4 — cinematic).

  The reference register: one tiny letterspaced label, one very large thin
  serif word, a short lede, one pale pill. Everything else gets out of the
  way so the object beside it is the only lit thing on the screen.

  The headline is one colour now. It was three — white, blue, gold across a
  single line — which is the loudest thing separating this from the
  references, where the type is monochrome and the object carries all the
  colour.
*/
export function Hero() {
    return (
        <section data-reveal className="flex flex-col items-start">
            <p className="cine-label flex items-center gap-2.5">
                <span
                    aria-hidden
                    className="inline-block h-px w-8 bg-[color-mix(in_srgb,var(--foreground)_35%,transparent)]"
                />
                No code. Your words.
        <section data-reveal className="flex flex-col">
            <p className="glass-pill mb-6 w-fit font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
                No code needed. Just your words.
            </p>

            <h1 className="cine-display mt-7 text-foreground">
                Say it.
                <br />
                See it built.
            </h1>

            <p className="cine-lede mt-8">
                Describe the website living in your head. PageCrafts turns those words into a
                real site — while it comes together in front of you.
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                Tell us about your business. We will build a real website for you — you can
                watch it come together on your screen.
            </p>

            <div className="mt-10 w-full max-w-xl">
                <HeroPrompt />
            </div>

            <p className="cine-label mt-8">Free to build · Rs 249 to publish</p>
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

