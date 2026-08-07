import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

export const vellum: Template = buildTemplate({
    id: "vellum",
    name: "Vellum",
    description: "A single-column resume page — history, skills and how to reach you.",
    category: "resume",
    tags: ["resume", "light", "one-page", "print-friendly"],
    tier: "free",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/vellum",
    layout: "showcase",
    palette: {
        bg: "#ffffff",
        ink: "#111827",
        muted: "#6b7280",
        accent: "#374151",
        panel: "#f9fafb",
        rule: "#e5e7eb",
    },
    nav: ["Experience", "Skills", "Contact"],
    hero: {
        headline: "Your name",
        subhead: "What you do, where you are, and the one line you would want a stranger to remember.",
        cta: "Download CV",
    },
    sections: [
        {
            key: "experience",
            label: "Roles",
            kind: "cards",
            heading: "Experience",
            body: "Most recent first. Two lines each — what the job was, and what changed while you had it.",
            cards: [
                { title: "Most recent role", body: "Company, dates, and the thing you are proudest of shipping there." },
                { title: "Before that", body: "The role that taught you the craft. Say what you owned." },
                { title: "Earlier", body: "One line is enough this far back." },
            ],
        },
        {
            key: "contact",
            label: "Contact",
            kind: "prose",
            heading: "Get in touch",
            body: "The best email to reach you on, and anywhere else worth linking — a portfolio, a repository, a profile.",
        },
    ],
    footer: "References available on request.",
});
