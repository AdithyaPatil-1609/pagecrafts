import type { Category, ContentSchema, Template, TemplateTier } from "@/lib/contracts";
import { previewOf, type TemplatePreview } from "@/lib/discovery/preview";
import { templateUuid } from "./template-id";

// Template detail contract without file bodies.
export interface TemplateFileEntry {
    path: string;
    bytes: number;
}

export interface TemplateDetail {
    /** The library slug — what a URL carries and what a person reads. */
    id: string;
    /**
     * The `templates.id` this design occupies once seeded, derived from the slug (R3 D8).
     *
     * The CTA forks with this rather than the slug, because source_template_id is a foreign
     * key and createProjectSchema rightly insists on a uuid. Sent alongside the slug rather
     * than replacing it: the slug is still what /templates/<id> is addressed by.
     */
    forkId: string;
    name: string;
    description: string;
    category: Category;
    tags: string[];
    thumbnailUrl: string;
    contentSchema: ContentSchema;
    /** The file map, as a manifest. Never the file bodies. */
    files: TemplateFileEntry[];
    /** The parsed preview miniature. */
    preview: TemplatePreview;
    /** Provenance details. */
    license: string;
    sourceUrl: string;
    tier: TemplateTier;
    priceInr: number;
    /** Editable section metadata derived from contentSchema. */
    editable: { key: string; label: string; fields: number }[];
}

// Bytes as the wire counts them, not as JavaScript counts characters: a rupee sign is one
// character and three bytes, and the manifest is a size, not a length.
const encoder = new TextEncoder();

export function toTemplateDetail(template: Template): TemplateDetail {
    return {
        id: template.id,
        forkId: templateUuid(template.id),
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

/** Formats the template manifest into a human-readable size/page summary line. */
export function madeOfLine(files: TemplateFileEntry[]): string {
    const pages = files.filter((file) => /\.html?$/i.test(file.path)).length;
    const bytes = files.reduce((total, file) => total + file.bytes, 0);
    const size = bytes < 1024 ? `${bytes} bytes` : `${Math.round(bytes / 1024)} KB`;

    return pages > 0 ? `${pages} page${pages === 1 ? "" : "s"} · ${size}` : size;
}

/** Returns the price line label for paid templates, or null if free. */
export function priceLine(tier: TemplateTier, priceInr: number): string | null {
    return tier === "free" ? null : `Rs ${priceInr}`;
}
