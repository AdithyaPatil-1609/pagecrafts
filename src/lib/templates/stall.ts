import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

export const stall: Template = buildTemplate({
    id: "stall",
    name: "Stall",
    description: "A small shop front — a handful of products, each with a price and a photo.",
    category: "store",
    tags: ["store", "light", "grid", "products"],
    tier: "premium",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/stall",
    layout: "showcase",
    palette: {
        bg: "#fffdf8",
        ink: "#1f2937",
        muted: "#6b7280",
        accent: "#b45309",
        panel: "#f7f1e6",
        rule: "#ece7dd",
    },
    nav: ["Shop", "Lookbook", "Stockists"],
    hero: {
        headline: "The Corner Stall",
        subhead: "Six things, made slowly, in small batches. When they are gone they are gone.",
        cta: "Shop the batch",
    },
    sections: [
        {
            key: "products",
            label: "Products",
            kind: "cards",
            heading: "This batch",
            body: "Every piece is made to order and posted within the week.",
            cards: [
                { title: "The everyday tote", body: "Waxed canvas, leather handles. Rs 2,400." },
                { title: "The small pouch", body: "Fits a phone, keys and not much else. Rs 900." },
                { title: "The long apron", body: "For the kitchen or the workshop. Rs 1,800." },
            ],
        },
        {
            key: "contact",
            label: "To order",
            kind: "form",
            heading: "To order",
            body: "Tell us what you are after and we will send a payment link. Wholesale enquiries welcome.",
        },
    ],
    footer: "Made in small batches. Posted worldwide.",
});
