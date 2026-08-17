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
 * `thumbnail_url` must be an https URL or null — the column check rejects the
 * relative `/templates/...` paths the blueprints still carry. The gallery never
 * reads this column; it draws a miniature from the markup. Null here means
 * "not rendered yet", which is true until the thumbnail pipeline writes one.
 */
export function templateRow(template: Template, category: Category = template.category) {
    return {
        id: templateUuid(template.id),
        name: template.name,
        description: template.description,
        category,
        tags: template.tags,
        thumbnail_url: thumbnailUrlFor(template),
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
