"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { TemplateSummary } from "@/lib/templates/query";
import { TemplatePreview } from "@/components/discovery/TemplatePreview";

/*
  Hero object (R4 — cinematic).

  The reference puts one thing on screen — a planet — and scrubs its scale to
  the scroll until it stops being an illustration and becomes the environment.
  Here that object is a real site from the library, which is the honest
  substitution: their hero object is a planet, ours is a website.

  Was five frames scattered across a flat rectangle, each bobbing on its own
  float loop. Five independent moving things read as noise and left nothing
  dominant enough to carry a hero.

  Mechanics: scale and opacity only, written straight to the node inside a
  rAF, so nothing here re-renders React on scroll and nothing leaves the
  compositor. Under reduced motion the object simply sits at rest — the scrub
  is decorative, and losing it costs no information.
*/

function useReducedMotion(): boolean {
    return useSyncExternalStore(
        (cb) => {
            const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
            mq.addEventListener("change", cb);
            return () => mq.removeEventListener("change", cb);
        },
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        () => false,
    );
}

export function HeroArtwork({ templates }: { templates: TemplateSummary[] }) {
    const ref = useRef<HTMLDivElement>(null);
    const frame = useRef(0);
    const reduce = useReducedMotion();
    const [index, setIndex] = useState(0);
    const template = templates[index] ?? templates[0];

    useEffect(() => {
        const el = ref.current;
        if (!el || reduce) return;

        const update = () => {
            frame.current = 0;
            // 0 at rest, 1 once the hero has scrolled a full viewport away.
            const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
            // Grows toward the reader and drifts up, the way the planet does.
            el.style.transform = `scale(${(1 + p * 0.42).toFixed(3)}) translate3d(0, ${(-p * 40).toFixed(1)}px, 0)`;
            el.style.opacity = String((1 - p * 0.45).toFixed(3));
        };

        const onScroll = () => {
            if (frame.current) return;
            frame.current = requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame.current) cancelAnimationFrame(frame.current);
        };
    }, [reduce]);

    if (!template) return null;

    return (
        <div className="relative w-full">
            {/* The object. aria-hidden: the gallery is the real way to browse
                these, and this is the same content as decoration. */}
            <div
                aria-hidden
                ref={ref}
                className="cine-object cine-vignette aspect-[16/10] w-full origin-[50%_60%] will-change-transform"
            >
                {template.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={template.thumbnailUrl}
                        alt=""
                        width={1280}
                        height={800}
                        fetchPriority="high"
                        decoding="async"
                        className="absolute inset-0 size-full object-cover object-top"
                    />
                ) : (
                    <div className="absolute inset-0 [&_>div]:h-full [&_>div]:w-full [&_>div]:aspect-auto">
                        <TemplatePreview preview={template.preview} priority />
                    </div>
                )}
            </div>

            {/* The name of what you are looking at, and a way to change it —
                the reference's MERCURY / EARTH edge labels, made functional. */}
            <div className="mt-6 flex items-center justify-between gap-4">
                <span className="cine-label truncate text-foreground/70">{template.name}</span>
                <div className="flex items-center gap-1.5">
                    {templates.slice(0, 5).map((t, i) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`Show ${t.name}`}
                            aria-pressed={i === index}
                            className="group flex h-11 w-6 items-center justify-center focus-visible:outline-none"
                        >
                            <span
                                className={
                                    "block h-px w-full transition-colors duration-[var(--dur-hover)] " +
                                    (i === index
                                        ? "bg-foreground"
                                        : "bg-[color-mix(in_srgb,var(--foreground)_25%,transparent)] group-hover:bg-foreground/60 group-focus-visible:bg-foreground")
                                }
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
