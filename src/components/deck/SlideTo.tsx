"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const SLIDES = new Set(["welcome", "how-it-works", "build", "sites", "settings"]);
const ALIAS: Record<string, string> = {
    top: "welcome",
    looks: "welcome",
    templates: "build",
    assistant: "build",
    "sign-in": "welcome",
};

/** Scrolls the home deck to a slide named in ?slide= or the URL hash. */
export function SlideTo() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const fromQuery = searchParams.get("slide");
        const fromHash = window.location.hash.replace(/^#/, "");
        const raw = (fromQuery || fromHash).trim();
        const id = ALIAS[raw] ?? raw;
        if (!SLIDES.has(id)) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const go = () => {
            document.getElementById(id)?.scrollIntoView({
                behavior: reduce ? "auto" : "smooth",
                block: "start",
            });
        };

        const timer = window.setTimeout(go, 40);
        return () => window.clearTimeout(timer);
    }, [searchParams]);

    return null;
}
