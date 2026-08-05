// PATCH /projects/{id}/content — the guided content panel (E-1). Edits mutate the
// structured content_json against the template's content_schema and re-render; no code
// is touched. This is Meera's entire editing surface.
export interface ContentOp {
  path: string; // dotted slot path, e.g. "hero.headline"
  value: unknown;
}

export interface PatchContentRequest {
  ops: ContentOp[];
}

export interface PatchContentResponse {
  rendered: boolean;
  dirty: boolean;
}
