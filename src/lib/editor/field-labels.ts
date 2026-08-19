import type { ContentSection, Field } from "@/lib/contracts";

// What the content panel calls things.
//
// The labels used to come out of the stored `content_schema` and read like the code that
// generated them — "Hero", "Headline (max 60)", "Body", "Site", "Item 1". Every one of those
// is a word we chose for ourselves. A person who has just picked a restaurant design and
// wants to change the big sentence at the top does not know that sentence is called a
// headline, or that the section it lives in is called a hero.
//
// Derived here rather than fixed in the schema, deliberately. `content_schema` is copied
// into a project when it is forked, so a label stored there is a label frozen at fork time —
// changing the wording would leave every existing project reading the old copy until
// somebody wrote a migration, and then again for the next change. Wording is presentation
// and it is going to keep moving; the keys are the data and they do not.
//
// The stored label is still the fallback. Anything this does not have an opinion about —
// a design with an unusual field, a schema written by hand — reads exactly as it did.

/** Sections whose own name is a word we invented rather than one a person would use. */
const SECTION_LABEL: Record<string, string> = {
    hero: "First Section",
    site: "Your Website",
};

/**
 * The noun a section's fields are named after.
 *
 * Separate from what the section is *called*, because the two want different words. The
 * menu section is headed "Your Menu" and its fields read "Menu Heading" — "Your Menu
 * Heading" would be clumsy. And a section keyed `book` is headed "Book a Table" while its
 * fields want "Booking", which no rule derives from either.
 */
const SECTION_NOUN: Record<string, string> = {
    book: "Booking",
    booking: "Booking",
    contact: "Contact",
    about: "About",
};

/** Fields whose meaning does not depend on which section they are in. */
const FIELD_LABEL: Record<string, Record<string, string>> = {
    hero: {
        headline: "Main Heading",
        subhead: "Short Description",
        cta: "Button Text",
        image: "Main Image",
    },
    site: {
        name: "Website Name",
        footer: "Bottom Text",
    },
};

/** Fields inside a list item. The list already says what the items are. */
const ITEM_LABEL: Record<string, string> = {
    title: "Item Name",
    body: "Item Description",
    name: "Item Name",
};

function humanise(key: string): string {
    const words = key.replace(/[_-]+/g, " ").trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Most section keys are already plural — `rooms`, `services`, `packages`, `strategies`.
 *
 * Without this the buttons read "Add Rooms Item" and "Add Strategies Item". English is only
 * regular enough for this to work because the input is a small set of ordinary nouns we
 * chose ourselves, not arbitrary text: no irregular plurals appear across the 115 designs,
 * and a key that does not end in `s` is left exactly as it is.
 */
function singular(noun: string): string {
    if (/ies$/i.test(noun)) return `${noun.slice(0, -3)}y`;      // strategies -> strategy
    if (/(s|sh|ch|x|z)es$/i.test(noun)) return noun.slice(0, -2); // classes -> class
    if (/ss$/i.test(noun)) return noun;                           // press stays press
    if (/s$/i.test(noun)) return noun.slice(0, -1);               // rooms -> room
    return noun;
}

const isPlural = (noun: string): boolean => singular(noun) !== noun;

/** The heading shown above a section's fields. */
export function sectionLabel(section: Pick<ContentSection, "key" | "label">): string {
    return SECTION_LABEL[section.key] ?? section.label ?? humanise(section.key);
}

/**
 * From the key, not the label.
 *
 * The label is what the section is called on screen and it is written to be read as a
 * heading — "Your Menu", "Book a Table". Building field names out of it gives "Your Menu
 * Heading" and "Add Your Menu Item". The key is the plain noun the section is *about*, which
 * is what a field name wants: "Menu Heading", "Add Menu Item".
 */
function nounFor(section: Pick<ContentSection, "key" | "label">): string {
    return SECTION_NOUN[section.key] ?? humanise(section.key);
}

/**
 * The label for one field, in the section it belongs to.
 *
 * `heading` and `body` appear in every section and mean something different in each, which
 * is why they are named after their section: "Menu Heading" and "Menu Description" rather
 * than two fields both called "Heading" that a person has to count down the page to tell
 * apart.
 */
export function fieldLabel(
    section: Pick<ContentSection, "key" | "label">,
    field: Pick<Field, "key" | "label" | "type">,
): string {
    const fixed = FIELD_LABEL[section.key]?.[field.key];
    if (fixed) return fixed;

    const noun = nounFor(section);

    if (field.key === "heading") return `${noun} Heading`;
    if (field.key === "body") return `${noun} Description`;
    // A plural noun is already the name of the list — "Rooms", not "Rooms Items".
    if (field.type === "list") return isPlural(noun) ? noun : `${noun} Items`;

    return field.label || humanise(field.key);
}

/** The label for a field inside a list item. */
export function itemFieldLabel(field: Pick<Field, "key" | "label">): string {
    return ITEM_LABEL[field.key] ?? field.label ?? humanise(field.key);
}

/**
 * What one entry in a list is called: "Menu Item", so the rows read "Menu Item 1" and the
 * button reads "Add Menu Item".
 *
 * Singular is taken from the noun rather than by trimming an "s" off the list's label —
 * that turns "Classes" into "Classe" and "Stories" into "Storie".
 */
export function itemLabel(section: Pick<ContentSection, "key" | "label">): string {
    const noun = nounFor(section);
    // "Add Room" where the section is `rooms`; "Add Menu Item" where it is `menu`. A single
    // rule would give "Add Rooms Item" or "Add Menu", and both read as a mistake.
    return isPlural(noun) ? singular(noun) : `${noun} Item`;
}
