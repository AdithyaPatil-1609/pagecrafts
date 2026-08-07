import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

// First real template entry (R2 · Day 1). Seeds the 10 / 18 / 25 grind.
// A permissive licence and a real source URL are mandatory (C-06): no provenance, no entry.
export const aurora: Template = buildTemplate({
    id: "aurora",
    name: "Aurora",
    description: "A clean one-page portfolio with a bold hero and an about section.",
    category: "portfolio",
    tags: ["minimal", "light", "one-page", "portfolio"],
    tier: "free",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/aurora",
    layout: "split",
    palette: {
        bg: "#ffffff",
        ink: "#171717",
        muted: "#6b7280",
        accent: "#4f46e5",
        panel: "#f4f4f5",
        rule: "#e5e7eb",
    },
    nav: ["Work", "About", "Contact"],
    hero: {
        headline: "Your name, your work.",
        subhead: "A simple portfolio that puts the work first, and everything else second.",
        cta: "View work",
    },
    sections: [
        {
            key: "about",
            label: "About",
            kind: "prose",
            heading: "About",
            body: "Tell people who you are and what you make. Two or three sentences is plenty — the work does the rest.",
        },
        {
            key: "work",
            label: "Projects",
            kind: "cards",
            heading: "Selected work",
            body: "A short list beats a long one. Pick the three pieces you want to be hired for.",
            cards: [
                { title: "Project one", body: "What it was, what you did, and what changed because of it." },
                { title: "Project two", body: "One line on the problem, one on your part in solving it." },
                { title: "Project three", body: "Keep it concrete. Numbers if you have them." },
            ],
        },
    ],
    footer: "Built with PageCraft.",
});
