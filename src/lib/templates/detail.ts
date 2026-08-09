import type { Category, ContentSchema, Template, TemplateTier } from "@/lib/contracts";
import { previewOf, type TemplatePreview } from "@/lib/discovery/preview";

// What GET /templates/{id} answers with (screen 05).
//
// It is the template record minus the file bodies. The detail modal needs to say what a
// design is made of, not to ship the design: sending two full files per open would cost
// tens of kilobytes to render a list nobody reads character by character. So the file map
// arrives as a manifest — path and size — and the markup itself stays on the server until a
// project is actually created from it.
export interface TemplateFileEntry {
    path: string;
    bytes: number;
}

export interface TemplateDetail {
    id: string;
    name: string;
    description: string;
    category: Category;
    tags: string[];
    thumbnailUrl: string;
    contentSchema: ContentSchema;
    /** The file map, as a manifest. Never the file bodies. */
    files: TemplateFileEntry[];
    /**
     * The miniature, already parsed out of the design's own markup (lib/discovery/preview).
     * Parsing happens here rather than in the browser for the same reason the manifest
     * carries no bodies: the modal can draw the design at three sizes without the files
     * ever crossing the wire.
     */
    preview: TemplatePreview;
    /** Provenance, non-null both (C-06) — this is what the week-4 licence audit reads. */
    license: string;
    sourceUrl: string;
    tier: TemplateTier;
    priceInr: number;
    /**
     * What the person is shown about editing this design, in their own words. Sections come
     * straight from `content_schema`, so a design cannot advertise a part it has no field
     * for — and nobody writes this list per template (C-07).
     */
    editable: { key: string; label: string; fields: number }[];
}

// Bytes as the wire counts them, not as JavaScript counts characters: a rupee sign is one
// character and three bytes, and the manifest is a size, not a length.
const encoder = new TextEncoder();

export function toTemplateDetail(template: Template): TemplateDetail {
    return {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        thumbnailUrl: template.thumbnailUrl,
        contentSchema: template.contentSchema,
        files: Object.entries(template.files)
            .map(([path, body]) => ({ path, bytes: encoder.encode(body).length }))
            .sort((a, b) => a.path.localeCompare(b.path)),
        preview: previewOf(template),
        license: template.license,
        sourceUrl: template.sourceUrl,
        tier: template.tier,
        priceInr: template.priceInr,
        editable: template.contentSchema.sections.map((section) => ({
            key: section.key,
            label: section.label,
            fields: section.fields.length,
        })),
    };
}

/**
 * The file map, said out loud.
 *
 * The modal owes the person an answer to "what am I actually getting?", and the honest
 * answer is the file map. But A1 is equally plain that they never meet a technical word, so
 * the manifest is read out as what it amounts to — pages and a size — rather than listed as
 * filenames. The paths themselves stay in the API response, where the licence audit and the
 * team can see them, and out of the funnel, where "index.html" would mean nothing good.
 */
export function madeOfLine(files: TemplateFileEntry[]): string {
    const pages = files.filter((file) => /\.html?$/i.test(file.path)).length;
    const bytes = files.reduce((total, file) => total + file.bytes, 0);
    const size = bytes < 1024 ? `${bytes} bytes` : `${Math.round(bytes / 1024)} KB`;

    return pages > 0 ? `${pages} page${pages === 1 ? "" : "s"} · ${size}` : size;
}

/**
 * What the price line beside the "use this design" button says.
 *
 * Two rules meet here. Prices are stated in rupees before any choice and never after (UI
 * Spec §7.18), so a paid design carries its price next to the very button that commits to
 * it. And a free design shows no price at all — writing "Rs 0" beside a button would invent
 * a transaction that does not exist, and the D4 acceptance is explicit that free designs
 * show no price.
 */
export function priceLine(tier: TemplateTier, priceInr: number): string | null {
    return tier === "free" ? null : `Rs ${priceInr}`;
}
