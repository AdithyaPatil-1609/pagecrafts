import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

export const quill: Template = buildTemplate({
    id: "quill",
    name: "Quill",
    description: "A quiet, readable blog — a short masthead and a list of posts.",
    category: "blog",
    tags: ["blog", "light", "editorial", "reading"],
    tier: "free",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/quill",
    layout: "centered",
    palette: {
        bg: "#fafaf9",
        ink: "#1c1917",
        muted: "#78716c",
        accent: "#292524",
        panel: "#f0efed",
        rule: "#e7e5e4",
    },
    nav: ["Latest", "Archive", "About"],
    hero: {
        headline: "Notes in the margin",
        subhead: "Short essays on the things I keep rereading. Roughly fortnightly, never automated.",
        cta: "Read the latest",
    },
    sections: [
        {
            key: "posts",
            label: "Posts",
            kind: "cards",
            heading: "Recent posts",
            body: "Everything is filed by date. The archive holds the rest.",
            cards: [
                { title: "On rereading", body: "Why the second pass through a book is the one that counts." },
                { title: "Small tools", body: "In praise of software that does one thing and then gets out of the way." },
                { title: "Notes on notes", body: "A system for remembering what you read, that survives contact with a busy month." },
            ],
        },
        {
            key: "about",
            label: "About",
            kind: "prose",
            heading: "About",
            body: "Written by one person, in the evenings. No newsletter, no tracking, no pop-up asking for your email.",
        },
    ],
    footer: "Written by hand. Published with PageCraft.",
});
