import { describe, expect, it } from "vitest";

import {
    activeFilterCount,
    chipHref,
    COLOURS,
    FEATURES,
    LAYOUTS,
    TIERS,
} from "@/lib/discovery/filters";
import { parseTemplateQuery, queryTemplates } from "@/lib/templates/query";

// R2 D7 — filter chips and the URL state behind them.

const params = (search: string) => new URLSearchParams(search);
const parse = (search: string) => parseTemplateQuery(params(search));
const run = (search: string) => queryTemplates(parse(search));

describe("a chip is a link to the gallery it would produce", () => {
    it("adds its filter when it is off", () => {
        expect(chipHref({}, "colour", "dark", false)).toBe("/templates?colour=dark");
    });

    it("clears its own filter when it is on, and leaves the others alone", () => {
        // The "individually clearable" half of D7: pressing an active chip removes exactly
        // one parameter rather than resetting the gallery.
        const href = chipHref({ colour: "dark", tier: "free" }, "colour", "dark", true);

        expect(href).toBe("/templates?tier=free");
    });

    it("goes back to a clean address when the last filter is cleared", () => {
        expect(chipHref({ colour: "dark" }, "colour", "dark", true)).toBe("/templates");
    });

    it("carries everything else across, so filters combine", () => {
        const href = chipHref({ category: "store", sort: "name" }, "tier", "free", false);
        const next = new URL(href, "http://x").searchParams;

        expect(next.get("category")).toBe("store");
        expect(next.get("sort")).toBe("name");
        expect(next.get("tier")).toBe("free");
    });

    it("keeps the description and the ranking when a filter changes", () => {
        // The sentence someone typed on the describe screen is the reason the gallery is
        // ordered the way it is. Pressing a chip must not quietly throw it away.
        const href = chipHref(
            { q: "a small online shop", intent: "store", tone: "warm" },
            "colour",
            "light",
            false,
        );
        const next = new URL(href, "http://x").searchParams;

        expect(next.get("q")).toBe("a small online shop");
        expect(next.get("intent")).toBe("store");
        expect(next.get("tone")).toBe("warm");
    });

    it("replaces rather than repeats when a group already has a value", () => {
        // Each group holds one value. Switching from dark to light must not leave
        // ?colour=dark&colour=light, which the parser would read as whichever came first.
        const href = chipHref({ colour: "dark" }, "colour", "light", false);

        expect(href).toBe("/templates?colour=light");
        expect(new URL(href, "http://x").searchParams.getAll("colour")).toEqual(["light"]);
    });
});

describe("every chip the gallery offers actually filters", () => {
    // The failure this catches: a chip offering a value the parser drops. The chip would
    // highlight, the URL would change, the grid would not move, and nothing would report a
    // fault. Both sides now read one list in lib/discovery/filters.ts; this checks it.
    it.each([
        ["colour", COLOURS],
        ["layout", LAYOUTS],
        ["feature", FEATURES],
        ["tier", TIERS],
    ] as const)("%s", (name, values) => {
        for (const value of values) {
            const query = parse(`${name}=${value}`);
            expect(query[name as keyof typeof query]).toBe(value);
        }
    });

    it("narrows the grid rather than leaving it whole", () => {
        const all = run("").items.length;

        for (const colour of COLOURS) {
            const narrowed = run(`colour=${colour}`).items;
            expect(narrowed.length).toBeLessThan(all);
            expect(narrowed.every((t) => t.colour === colour)).toBe(true);
        }
    });

    it("reports the library's size in total so 'N of M' stays honest", () => {
        const filtered = run("colour=dark");

        expect(filtered.total).toBe(run("").items.length);
        expect(filtered.items.length).toBeLessThan(filtered.total);
    });
});

describe("counting what is on", () => {
    it("counts nothing when the gallery is untouched", () => {
        expect(activeFilterCount(parse(""))).toBe(0);
    });

    it("counts each filter once, and does not count the sort", () => {
        // Sort is not a filter: it reorders the same designs. Counting it would make
        // "2 filters on" appear on a gallery showing the whole library.
        expect(activeFilterCount(parse("sort=name"))).toBe(0);
        expect(activeFilterCount(parse("colour=dark&tier=free&sort=name"))).toBe(2);
    });

    it("counts an intent as nothing, because it ranks rather than filters", () => {
        expect(activeFilterCount(parse("intent=store&tone=warm"))).toBe(0);
    });
});

describe("a combination that matches nothing", () => {
    it("empties the grid without erroring, and total still reports the library", () => {
        // The no-results state needs both: an empty item list to render itself, and a total
        // to say what the reset would go back to.
        const all = run("").items;
        const categories = [...new Set(all.map((t) => t.category))];
        const colours = [...new Set(all.map((t) => t.colour))];

        const empty = categories
            .flatMap((category) => colours.map((colour) => ({ category, colour })))
            .find(({ category, colour }) =>
                !all.some((t) => t.category === category && t.colour === colour));

        expect(empty).toBeDefined();
        const result = run(`category=${empty!.category}&colour=${empty!.colour}`);

        expect(result.items).toEqual([]);
        expect(result.total).toBe(all.length);
    });
});
