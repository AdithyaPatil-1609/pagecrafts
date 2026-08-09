import type { Category } from "@/lib/contracts";

// The category cards the describe screen actually renders (screen 03).
//
// Kept here rather than inside the component so the funnel's first choice can be tested:
// every card has to lead somewhere with designs in it, and that is only checkable if the
// list is reachable from a test. It is deliberately NOT the same list as CATEGORY_CARDS in
// categories.ts — those are the twelve buckets the library ships a design for, this is the
// six broad choices the describe screen offers a newcomer.
//
// Where a card's bucket has no design of its own (E-commerce today), toCategory() declines
// to filter on it and the gallery opens on the whole library — the whole library being a
// better answer to "I want a shop" than an empty grid (D-4, D-6, FR-035). That is a
// deliberate fall-through, and tests/unit/discovery.test.ts pins it as one so it cannot
// become an accident.

const CARD_PHOTO = "?w=800&q=70&auto=format&fit=crop";
const cardImg = (id: string): string => `https://images.unsplash.com/${id}${CARD_PHOTO}`;

export interface IntentCard {
    category: Category;
    label: string;
    description: string;
    image: string;
}

export const INTENT_CARDS: IntentCard[] = [
    {
        category: "business",
        label: "Business",
        description: "Corporate sites, company profiles, and professional services.",
        image: cardImg("photo-1486406146926-c627a92ad1ab"),
    },
    {
        category: "portfolio",
        label: "Portfolio",
        description: "Showcase your work, skills, and creative projects.",
        image: cardImg("photo-1498050108023-c5249f4df085"),
    },
    {
        category: "blog",
        label: "Blog",
        description: "Share your ideas, stories, and expertise with your audience.",
        image: cardImg("photo-1517842645767-c639042777db"),
    },
    {
        category: "store",
        label: "E-commerce",
        description: "Sell products online with beautiful storefronts and secure checkout.",
        image: cardImg("photo-1607082348824-0a96f2a4b9da"),
    },
    {
        category: "event",
        label: "Event",
        description: "Promote events, sell tickets, and engage attendees.",
        image: cardImg("photo-1470229722913-7c0e2dbbafd3"),
    },
    {
        category: "other",
        label: "Other",
        description: "Non-profits, communities, landing pages, and more.",
        image: cardImg("photo-1522071820081-009f0129c71c"),
    },
];
