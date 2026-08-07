import type { Template } from "@/lib/contracts";
import { buildTemplate } from "./blueprint";

export const ledger: Template = buildTemplate({
    id: "ledger",
    name: "Ledger",
    description: "A crisp light SaaS landing page — hero, feature grid and a call to action.",
    category: "saas",
    tags: ["saas", "light", "one-page", "has-form"],
    tier: "premium",
    license: "MIT",
    sourceUrl: "https://github.com/pagecraft/templates/tree/main/ledger",
    layout: "split",
    palette: {
        bg: "#ffffff",
        ink: "#0f172a",
        muted: "#64748b",
        accent: "#2563eb",
        panel: "#f1f5f9",
        rule: "#e2e8f0",
    },
    nav: ["Product", "Pricing", "Docs", "Sign in"],
    hero: {
        headline: "Invoicing that runs itself.",
        subhead: "Send, track and get paid — without the spreadsheet you have been quietly dreading.",
        cta: "Start free",
    },
    sections: [
        {
            key: "features",
            label: "Features",
            kind: "cards",
            heading: "Everything the spreadsheet was doing badly",
            body: "Three things you stop having to remember on the first of every month.",
            cards: [
                { title: "Recurring invoices", body: "Set it once. It goes out on time, every time, in the right currency." },
                { title: "Chasing, handled", body: "Polite reminders at seven, fourteen and thirty days. You never send them." },
                { title: "Books that reconcile", body: "Payments match themselves to invoices. Your accountant stops emailing." },
            ],
        },
        {
            key: "cta",
            label: "Get started",
            kind: "form",
            heading: "Ready in five minutes",
            body: "Free while you are under ten invoices a month. No card, no call, no demo.",
        },
    ],
    footer: "Ledger — invoicing for small teams.",
});
