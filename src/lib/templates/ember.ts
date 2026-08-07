import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

export const ember: Template = buildTemplate({
    id: "ember",
    name: "Ember",
    description: "A warm, dark one-page site for a restaurant — menu, hours and a booking prompt.",
    category: "restaurant",
    tags: ["restaurant", "dark", "one-page", "has-menu", "has-form"],
    tier: "free",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/ember",
    layout: "full-bleed",
    palette: {
        bg: "#14100e",
        ink: "#f6efe9",
        muted: "#b7a89b",
        accent: "#e2683b",
        panel: "#1e1815",
        rule: "#2c2420",
    },
    nav: ["Menu", "Hours", "Find us"],
    hero: {
        headline: "Wood-fired plates, poured slow.",
        subhead: "A small kitchen on the corner. Open Wednesday to Sunday, from six until late.",
        cta: "Book a table",
    },
    sections: [
        {
            key: "menu",
            label: "Menu",
            kind: "cards",
            heading: "This week",
            body: "The menu changes with what the market has. These are the plates people come back for.",
            cards: [
                { title: "From the fire", body: "Whole aubergine, burnt butter, sesame and lime." },
                { title: "From the pot", body: "Slow lamb, cinnamon and dried apricot, over rice." },
                { title: "To finish", body: "Burnt basque cheesecake, or whatever the pastry chef feels." },
            ],
        },
        {
            key: "book",
            label: "Request a table",
            kind: "form",
            heading: "Come and eat",
            body: "Leave your email and we will confirm a table within the day. Walk-ins welcome at the bar.",
        },
    ],
    footer: "Open Wed–Sun, 6pm till late.",
});
