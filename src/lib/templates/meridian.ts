import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

// The signature tier's flagship (Doc 22 P3): the richest layout in the library.
export const meridian: Template = buildTemplate({
    id: "meridian",
    name: "Meridian",
    description: "A bold, animated agency showcase — statement hero, services and selected work.",
    category: "agency",
    tags: ["agency", "dark", "animated", "one-page", "signature"],
    tier: "signature",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/meridian",
    layout: "full-bleed",
    palette: {
        bg: "#0b0b12",
        ink: "#f4f4ff",
        muted: "#9a9ab5",
        accent: "#7c5cff",
        panel: "#14141f",
        rule: "#232334",
    },
    nav: ["Work", "Studio", "Services", "Contact"],
    hero: {
        headline: "We build brands that move.",
        subhead: "A studio for ambitious founders who would rather be remembered than merely noticed.",
        cta: "See the work",
    },
    sections: [
        {
            key: "services",
            label: "Services",
            kind: "cards",
            heading: "What we do",
            body: "Three practices, one team. Most projects use all three.",
            cards: [
                { title: "Strategy", body: "Positioning, naming and the argument your brand is actually making." },
                { title: "Identity", body: "Marks, type, motion and the system that keeps it all consistent." },
                { title: "Build", body: "Sites and products, shipped — not handed over as a PDF." },
            ],
        },
        {
            key: "work",
            label: "Selected work",
            kind: "prose",
            heading: "Selected work",
            body: "Twelve years, ninety launches, four industries we know better than most. Ask us about the ones that did not work — those are the useful stories.",
        },
    ],
    footer: "Meridian — an independent studio.",
});
