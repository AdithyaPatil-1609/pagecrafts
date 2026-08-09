import { describe, expect, it } from "vitest";
import { canonicaliseTree, treeSha } from "@/lib/data/tree-hash";

describe("treeSha", () => {
  it("is stable for the same tree", () => {
    const tree = { "index.html": "<h1>hi</h1>", "style.css": "body{}" };
    expect(treeSha(tree)).toBe(treeSha({ ...tree }));
  });

  it("ignores key order", () => {
    const a = { "index.html": "one", "about.html": "two" };
    const b = { "about.html": "two", "index.html": "one" };
    expect(treeSha(a)).toBe(treeSha(b));
  });

  it("changes when content changes", () => {
    expect(treeSha({ "index.html": "one" })).not.toBe(treeSha({ "index.html": "two" }));
  });

  it("changes when a file is added or removed", () => {
    const one = { "index.html": "one" };
    const two = { "index.html": "one", "about.html": "" };
    expect(treeSha(one)).not.toBe(treeSha(two));
  });

  it("cannot be confused by a path/content boundary shift", () => {
    expect(canonicaliseTree({ ab: "c" })).not.toBe(canonicaliseTree({ a: "bc" }));
    expect(treeSha({ ab: "c" })).not.toBe(treeSha({ a: "bc" }));
  });

  it("produces a sha the commits table will accept", () => {
    expect(treeSha({ "index.html": "hi" })).toMatch(/^[0-9a-f]{40}$/);
  });
});
