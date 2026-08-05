import { describe, expectTypeOf, it } from "vitest";

import type {
  ApiResult,
  Category,
  ContentSchema,
  FileMap,
  GenerateSiteRequest,
  Template,
} from "@/lib/contracts";

describe("frozen contracts", () => {
  it("keeps the template, content, file-map, and API boundaries aligned", () => {
    expectTypeOf<Category>().toEqualTypeOf<Template["category"]>();
    expectTypeOf<FileMap>().toEqualTypeOf<Template["files"]>();
    expectTypeOf<ContentSchema>().toEqualTypeOf<Template["contentSchema"]>();
    expectTypeOf<GenerateSiteRequest["projectIntent"]>().toEqualTypeOf<Category>();
    expectTypeOf<ApiResult<Template>>().toMatchTypeOf<
      { ok: true; data: Template } | { ok: false; error: unknown }
    >();
  });
});
