import type { Category, Template } from "@/lib/contracts";
import { templateUuid } from "./template-id";
import { thumbnailUrlFor } from "./thumbnails";

export function isCategoryEnumError(message: string): boolean {
    return /invalid input value for enum template_category/i.test(message);
}

type TemplateWriter = {
    from: (table: "templates") => {
        upsert: (
            row: object | object[],
            options: { onConflict: string },
        ) => PromiseLike<{ error: { message: string } | null }>;
    };
};

/**
 * The `templates` row a library design occupies.
 *
 * `thumbnail_url` must be an absolute https URL or null: the column's CHECK is
 * `thumbnail_url is null or thumbnail_url ~ '^https://'`, so a relative path is refused by
 * Postgres rather than stored.
 *
 * That matters more since R2 D18, which rendered the thumbnails and made thumbnailUrlFor()
 * return `/templates/<id>.webp` — the right answer for the app, served by the CDN in front
 * of it, and not a value this column can hold. Sending it upserted 115 rows straight into a
 * constraint violation. absoluteOnly() is the seam: the app keeps its relative path, the
 * database gets https or nothing.
 *
 * Null means "no thumbnail at a URL the database can name", which is honest — the gallery
 * never reads this column anyway; it uses thumbnailUrlFor() and falls back to a miniature
 * drawn from the markup. Set NEXT_PUBLIC_TEMPLATE_THUMBNAIL_BASE to a storage bucket and
 * the same function returns an https URL, which lands here without any other change.
 */
function absoluteOnly(url: string | null): string | null {
    return url && /^https:\/\//.test(url) ? url : null;
}

export function templateRow(template: Template, category: Category = template.category) {
    return {
        id: templateUuid(template.id),
        name: template.name,
        description: template.description,
        category,
        tags: template.tags,
        thumbnail_url: absoluteOnly(thumbnailUrlFor(template)),
        files: template.files,
        content_schema: template.contentSchema,
        license: template.license,
        source_url: template.sourceUrl,
        tier: template.tier,
    };
}

/**
 * Write library rows even when this database has not yet gained the newer
 * category enum values (hospitality, automotive, …). Those designs still fork;
 * they are stored as `other` until the migration is applied and seed is re-run.
 */
export async function writeLibraryRows(
    supabase: TemplateWriter,
    templates: Template[],
): Promise<{ error: { message: string } | null; usedOther: string[] }> {
    const usedOther: string[] = [];
    const { error } = await supabase.from("templates").upsert(
        templates.map((template) => templateRow(template)),
        { onConflict: "id" },
    );
    if (!error) return { error: null, usedOther };
    if (!isCategoryEnumError(error.message)) return { error, usedOther };

    for (const template of templates) {
        let result = await supabase.from("templates").upsert(templateRow(template), { onConflict: "id" });
        if (result.error && isCategoryEnumError(result.error.message)) {
            result = await supabase.from("templates").upsert(templateRow(template, "other"), {
                onConflict: "id",
            });
            if (!result.error) usedOther.push(template.id);
        }
        if (result.error) return { error: result.error, usedOther };
    }

    return { error: null, usedOther };
}
