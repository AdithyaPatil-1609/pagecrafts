import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

export const marquee: Template = buildTemplate({
    id: "marquee",
    name: "Marquee",
    description: "A one-page event site — date, line-up and a place to register.",
    category: "event",
    tags: ["event", "bold", "one-page", "has-form"],
    tier: "free",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/marquee",
    layout: "centered",
    palette: {
        bg: "#0b1120",
        ink: "#f8fafc",
        muted: "#94a3b8",
        accent: "#facc15",
        panel: "#131c2f",
        rule: "#1e293b",
    },
    nav: ["Line-up", "Venue", "Tickets"],
    hero: {
        headline: "Field Notes 2026",
        subhead: "14 September · Bengaluru. One day, one room, twelve people worth listening to.",
        cta: "Get tickets",
    },
    sections: [
        {
            key: "lineup",
            label: "Speakers",
            kind: "cards",
            heading: "Line-up",
            body: "Talks are forty minutes. Questions are encouraged and the coffee is good.",
            cards: [
                { title: "Morning", body: "Three talks on building things that outlast the team that built them." },
                { title: "Afternoon", body: "Workshops, in small rooms, with people who have actually done it." },
                { title: "Evening", body: "Food, a bar and the part of the day where the real conversations happen." },
            ],
        },
        {
            key: "register",
            label: "Register",
            kind: "form",
            heading: "Come along",
            body: "Tickets are limited to two hundred. Leave your email and we will send the link when they open.",
        },
    ],
    footer: "Field Notes · 14 September 2026 · Bengaluru",
});
