import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

// This is the entry for `category: "other"` — the landing spot for anyone whose description
// classified to nothing in particular. It has to work for every kind of site, so it stays
// deliberately plain: structure without a personality to argue with.
export const canvas: Template = buildTemplate({
    id: "canvas",
    name: "Canvas",
    description: "A plain, flexible page for anything that is not quite like the rest.",
    category: "other",
    tags: ["flexible", "light", "one-page", "starter"],
    tier: "free",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/canvas",
    layout: "centered",
    palette: {
        bg: "#ffffff",
        ink: "#18181b",
        muted: "#71717a",
        accent: "#3f3f46",
        panel: "#f4f4f5",
        rule: "#e4e4e7",
    },
    nav: ["About", "Work", "Contact"],
    hero: {
        headline: "Say the thing",
        subhead: "One clear sentence about what this page is for, and who it is for. Change everything below.",
        cta: "Get in touch",
    },
    sections: [
        {
            key: "body",
            label: "Main",
            kind: "prose",
            heading: "The detail",
            body: "The middle of the page, where you explain the thing properly. As long or short as it needs to be.",
        },
        {
            key: "contact",
            label: "Send",
            kind: "form",
            heading: "Get in touch",
            body: "However people should reach you — an email box, a phone number, or an address on a map.",
        },
    ],
    footer: "Built with PageCraft.",
});
