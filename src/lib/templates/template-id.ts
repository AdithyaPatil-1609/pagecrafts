import { createHash } from "node:crypto";

// The bridge between the library and the database (R3 D8).
//
// A design is authored with a slug — `gym`, `wedding-photographer` — because that is what
// belongs in a URL and what a person reading the code recognises. A project row, though,
// references `templates.id`, which is a uuid, and createProjectSchema is right to insist on
// one: a foreign key is not a place for a hand-typed name.
//
// So the id is derived from the slug rather than generated. Deriving it means the same
// design is the same row in every environment — a project forked from `gym` on someone's
// laptop points at the same design as one forked in production, and re-running the seed
// updates a design in place instead of quietly creating a second copy of it. A random uuid
// per environment would make every fixture, every seed and every bug report environment-
// specific.
//
// This is uuid v5 (RFC 4122 §4.3): sha1 over a fixed namespace plus the name, with the
// version and variant bits set. Chosen over v4 for exactly the property above, and written
// out rather than taken from a dependency because it is nine lines and the alternative is a
// package in the critical path of the seed.

// A random-but-fixed namespace, generated once for PageCraft's template library. It never
// changes: changing it would give every design a new id and orphan every project that
// references the old one.
const NAMESPACE = "8f2a1c64-5c1e-4b3f-9a7d-2e6b0c4d8a91";

function namespaceBytes(): Buffer {
    return Buffer.from(NAMESPACE.replace(/-/g, ""), "hex");
}

/** The `templates.id` a library design occupies. Stable for the life of the slug. */
export function templateUuid(slug: string): string {
    const hash = createHash("sha1")
        .update(namespaceBytes())
        .update(Buffer.from(slug, "utf8"))
        .digest();

    // Version 5 in the high nibble of byte 6; RFC 4122 variant in the top bits of byte 8.
    hash[6] = (hash[6] & 0x0f) | 0x50;
    hash[8] = (hash[8] & 0x3f) | 0x80;

    const hex = hash.subarray(0, 16).toString("hex");
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
    ].join("-");
}
