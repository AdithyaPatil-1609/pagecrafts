import { describe, it, expect } from "vitest";
import {
  createUnsplashAssetSchema,
  patchContentSchema,
  putFileSchema,
} from "@/lib/contracts/schemas";
import { isValidFilePath } from "@/lib/data/validate-file-map";
import { isAllowedImageMime, MAX_ASSET_BYTES } from "@/lib/data/project-assets";
import { statusFor } from "@/lib/errors/codes";

describe("R3 D3 request schemas", () => {
  it("putFileSchema wants a string content body", () => {
    expect(putFileSchema.safeParse({ content: "<h1>hi</h1>" }).success).toBe(true);
    expect(putFileSchema.safeParse({ content: 7 }).success).toBe(false);
    expect(putFileSchema.safeParse({}).success).toBe(false);
  });

  it("patchContentSchema wants 1-50 ops with string paths", () => {
    expect(
      patchContentSchema.safeParse({ ops: [{ path: "hero.headline", value: "x" }] }).success,
    ).toBe(true);
    expect(patchContentSchema.safeParse({ ops: [] }).success).toBe(false);
    expect(patchContentSchema.safeParse({ ops: [{ value: "x" }] }).success).toBe(false);
    // `value` may be anything, including null and nested arrays.
    expect(
      patchContentSchema.safeParse({ ops: [{ path: "menu.items", value: [{ a: 1 }] }] }).success,
    ).toBe(true);
  });

  it("createUnsplashAssetSchema takes source, id and an optional kind", () => {
    expect(
      createUnsplashAssetSchema.safeParse({ source: "unsplash", unsplashId: "abc123" }).success,
    ).toBe(true);
    expect(
      createUnsplashAssetSchema.safeParse({
        source: "unsplash",
        unsplashId: "abc123",
        kind: "og_image",
      }).success,
    ).toBe(true);
    expect(createUnsplashAssetSchema.safeParse({ source: "upload" }).success).toBe(false);
  });
});

describe("file-path validation backing PUT/DELETE /files/{path}", () => {
  it("accepts nested project paths", () => {
    expect(isValidFilePath("index.html")).toBe(true);
    expect(isValidFilePath("sections/hero.html")).toBe(true);
  });

  it("rejects traversal, absolute and empty paths (the 422 cases)", () => {
    expect(isValidFilePath("")).toBe(false);
    expect(isValidFilePath("/etc/passwd")).toBe(false);
    expect(isValidFilePath("../outside.html")).toBe(false);
    expect(isValidFilePath("a/../../b")).toBe(false);
  });

  it("rejects a NUL byte in a path", () => {
    // The guard for this existed and matched the wrong character. Its regex was a literal
    // U+FFFD — the replacement character an editor writes when it cannot decode a byte —
    // rather than \0, so a real NUL sailed through while a harmless pasted character was
    // refused. The database's own CHECK caught the path anyway, so nothing was ever stored
    // with one; what was lost is the clean 422 this function exists to give (R2 D19).
    //
    // Written with fromCharCode so no future save of this file can mangle it either.
    const nul = String.fromCharCode(0);
    expect(isValidFilePath(`index${nul}.html`)).toBe(false);
    expect(isValidFilePath(`${nul}`)).toBe(false);
    expect(isValidFilePath("index�.html")).toBe(true);
  });
});

describe("asset gates (E-4)", () => {
  it("allows exactly the bucket's mime types", () => {
    for (const mime of ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]) {
      expect(isAllowedImageMime(mime)).toBe(true);
    }
    expect(isAllowedImageMime("image/tiff")).toBe(false);
    expect(isAllowedImageMime("text/html")).toBe(false);
  });

  it("matches the 5 MB storage limit and maps payload_too_large to 413", () => {
    expect(MAX_ASSET_BYTES).toBe(5_242_880);
    expect(statusFor("payload_too_large")).toBe(413);
  });
});
