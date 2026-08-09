import { createHash } from "node:crypto";
import type { FileMap } from "@/lib/contracts";

// Content-addressed tree id. Same files in, same sha out — so saving twice without
// editing anything reuses the existing commit instead of growing history (E-6).
// Lengths are written before each value so no two different trees can serialise
// to the same string: {"ab": "c"} and {"a": "bc"} produce different text.
export function canonicaliseTree(files: FileMap): string {
  return Object.keys(files)
    .sort()
    .map((path) => `${path.length}:${path}:${files[path].length}:${files[path]};`)
    .join("");
}

export function treeSha(files: FileMap): string {
  return createHash("sha1").update(canonicaliseTree(files), "utf8").digest("hex");
}
