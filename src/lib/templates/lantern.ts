import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

export const lantern: Template = buildTemplate({
    id: "lantern",
    name: "Lantern",
    description: "A cause page — what you do, the numbers behind it, and a way to give.",
    category: "nonprofit",
    tags: ["nonprofit", "light", "one-page", "has-form"],
    tier: "free",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/lantern",
    layout: "split",
    palette: {
        bg: "#f8fafc",
        ink: "#0f172a",
        muted: "#64748b",
        accent: "#0d9488",
        panel: "#eef2f6",
        rule: "#e2e8f0",
    },
    nav: ["Our work", "Impact", "Give"],
    hero: {
        headline: "Lantern Trust",
        subhead: "We keep neighbourhood libraries open after school, in the places that need them most.",
        cta: "Give monthly",
    },
    sections: [
        {
            key: "impact",
            label: "Numbers",
            kind: "cards",
            heading: "Where your money goes",
            body: "We publish our accounts every quarter. These are the numbers behind last year.",
            cards: [
                { title: "22 libraries", body: "Open five afternoons a week, staffed by paid local coordinators." },
                { title: "4,100 children", body: "Through the doors last year, most of them more than once a week." },
                { title: "86 paise", body: "Of every rupee reaches a library. The rest keeps the lights on here." },
            ],
        },
        {
            key: "give",
            label: "Give",
            kind: "form",
            heading: "Stand with us",
            body: "Leave your email and we will send the ways to give, including standing orders and payroll giving.",
        },
    ],
    footer: "Lantern Trust is a registered charity.",
});
