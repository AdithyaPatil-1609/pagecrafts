import type { Template } from "@/lib/contracts";
import { templateUuid } from "./template-id";
import { thumbnailUrlFor } from "./thumbnails";

/**
 * The `templates` row a library design occupies.
 *
 * `thumbnail_url` must be an https URL or null — the column check rejects the
 * relative `/templates/...` paths the blueprints still carry. The gallery never
 * reads this column; it draws a miniature from the markup. Null here means
 * "not rendered yet", which is true until the thumbnail pipeline writes one.
 */
export function templateRow(template: Template) {
    return {
        id: templateUuid(template.id),
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        thumbnail_url: thumbnailUrlFor(template),
        files: template.files,
        content_schema: template.contentSchema,
        license: template.license,
        source_url: template.sourceUrl,
        tier: template.tier,
    };
}
