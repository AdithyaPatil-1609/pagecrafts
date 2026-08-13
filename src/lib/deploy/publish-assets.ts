import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentSchema, Field, FileMap, SiteMeta } from "@/lib/contracts";
import { ApiError } from "@/lib/errors/respond";

// Getting the owner's own images into the published build (R3 D11).
//
// Two things were unfinished before this, and they are the same thing seen from two sides.
//
// to-files.ts skips image slots when it renders content into the markup, with a comment
// saying images are "resolved at publish". Publish never resolved them, so a photograph
// somebody chose in the panel stayed in content_json as a uuid and the live page kept
// showing whatever the design shipped with.
//
// publishable.ts took an `assetUrls` map it had no way to fill, because the only URL this
// system can mint for a private asset is a signed one that expires in an hour — useless on
// a page that is meant to stay up.
//
// Both dissolve if the images travel *with* the build. An asset copied into the deployment
// is addressed by a relative path: no signing, no expiry, and no decision needed about
// making the bucket public.

const BUCKET = "project-assets";

// Mirrors project-assets.ts, which is the only writer of these rows.
const EXTENSION_BY_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
};

/** Where an asset lands inside the published site. Relative, so it survives any domain. */
export function assetPath(id: string, mimeType: string): string {
    return `assets/${id}.${EXTENSION_BY_MIME[mimeType] ?? "bin"}`;
}

function imageFieldsOf(schema: ContentSchema): { section: string; field: Field }[] {
    return schema.sections.flatMap((section) =>
        section.fields.map((field) => ({ section: section.key, field })),
    );
}

/**
 * Every asset id this site actually shows.
 *
 * Only the referenced ones are bundled. A project accumulates images somebody tried and
 * replaced, and shipping those would put photographs the owner thought they had removed
 * onto a public site — quietly, and at their bandwidth's expense.
 */
export function referencedAssetIds(
    content: Record<string, unknown>,
    schema: ContentSchema,
    siteMeta: SiteMeta,
): string[] {
    const ids = new Set<string>();

    for (const { section, field } of imageFieldsOf(schema)) {
        const holder = content[section] as Record<string, unknown> | undefined;
        if (!holder) continue;

        if (field.type === "image") {
            const value = holder[field.key];
            if (typeof value === "string" && value) ids.add(value);
            continue;
        }

        if (field.type === "list") {
            const imageKeys = (field.itemSchema ?? [])
                .filter((f) => f.type === "image")
                .map((f) => f.key);
            if (imageKeys.length === 0) continue;

            const items = holder[field.key];
            if (!Array.isArray(items)) continue;

            for (const item of items) {
                if (item === null || typeof item !== "object") continue;
                for (const key of imageKeys) {
                    const value = (item as Record<string, unknown>)[key];
                    if (typeof value === "string" && value) ids.add(value);
                }
            }
        }
    }

    if (siteMeta.faviconAssetId) ids.add(siteMeta.faviconAssetId);
    if (siteMeta.ogImageAssetId) ids.add(siteMeta.ogImageAssetId);

    return [...ids];
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeAttr = (value: string) => value.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/**
 * Point each image slot's `<img>` at the bundled file.
 *
 * The slot's markup is left otherwise alone — the class, the alt text and the surrounding
 * frame are the design's, and publishing is not the place to restyle them. Only `src`
 * changes, and only where content_json actually names an asset that made it into the build.
 *
 * A slot the owner has not touched keeps the design's own picture, which is the right
 * answer: they chose the design partly for it.
 */
export function applyAssetsToHtml(
    html: string,
    content: Record<string, unknown>,
    schema: ContentSchema,
    assetPaths: Record<string, string>,
): string {
    return html.replace(
        /(<[a-z0-9]+\b[^>]*?\sdata-slot="([^"]+)"[^>]*>)([\s\S]*?)(<\/[a-z0-9]+>)/gi,
        (whole, open: string, slot: string, inner: string, close: string) => {
            const segments = slot.split(".");
            let assetId: unknown;

            if (segments.length === 2) {
                const [sectionKey, fieldKey] = segments;
                const field = schema.sections
                    .find((s) => s.key === sectionKey)
                    ?.fields.find((f) => f.key === fieldKey);
                if (field?.type !== "image") return whole;
                assetId = (content[sectionKey] as Record<string, unknown> | undefined)?.[fieldKey];
            } else if (segments.length === 4) {
                const [sectionKey, fieldKey, index, itemKey] = segments;
                const field = schema.sections
                    .find((s) => s.key === sectionKey)
                    ?.fields.find((f) => f.key === fieldKey);
                if (field?.type !== "list") return whole;
                if ((field.itemSchema ?? []).find((f) => f.key === itemKey)?.type !== "image") return whole;

                const items = (content[sectionKey] as Record<string, unknown> | undefined)?.[fieldKey];
                if (!Array.isArray(items)) return whole;
                const item = items[Number(index)];
                if (item === null || typeof item !== "object") return whole;
                assetId = (item as Record<string, unknown>)[itemKey];
            } else {
                return whole;
            }

            if (typeof assetId !== "string") return whole;
            const path = assetPaths[assetId];
            if (!path) return whole;

            const nextInner = inner.replace(
                /(<img\b[^>]*?\ssrc=")[^"]*(")/i,
                `$1${escapeAttr(path)}$2`,
            );
            return `${open}${nextInner}${close}`;
        },
    );
}

export interface BundledAssets {
    /** path -> base64 body, ready to become PublishFiles. */
    files: Record<string, string>;
    /** asset id -> the path it occupies in the build. */
    paths: Record<string, string>;
}

/**
 * Pull the referenced assets out of storage and into the build.
 *
 * An asset that cannot be downloaded is skipped rather than failing the publish. The
 * alternative is refusing to put a site live because one picture is missing, which trades a
 * small visible fault for a total one — and every consumer of `paths` already treats an
 * absent entry as "leave the markup as it was".
 */
export async function bundleAssets(
    supabase: SupabaseClient,
    projectId: string,
    ids: string[],
): Promise<BundledAssets> {
    if (ids.length === 0) return { files: {}, paths: {} };

    const { data: rows, error } = await supabase
        .from("assets")
        .select("id, storage_path, mime_type")
        .eq("project_id", projectId);

    if (error) throw new ApiError("internal", "Could not read the images.", error.message);

    const wanted = new Set(ids);
    const files: Record<string, string> = {};
    const paths: Record<string, string> = {};

    for (const row of rows ?? []) {
        const id = row.id as string;
        if (!wanted.has(id)) continue;

        const { data: blob, error: downloadError } = await supabase.storage
            .from(BUCKET)
            .download(row.storage_path as string);

        if (downloadError || !blob) continue;

        const path = assetPath(id, row.mime_type as string);
        files[path] = Buffer.from(await blob.arrayBuffer()).toString("base64");
        paths[id] = path;
    }

    return { files, paths };
}

/** The bundled files as a FileMap-shaped record, for callers that think in trees. */
export function assetFileMap(bundled: BundledAssets): FileMap {
    return { ...bundled.files };
}
