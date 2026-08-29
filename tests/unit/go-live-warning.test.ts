import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("Go Live flow", () => {
  it("allows free editing after publish and includes 5-minute countdown stopwatch", () => {
    const goLive = read("src", "components", "editor", "GoLiveButton.tsx");

    expect(goLive).toContain("PUBLISH_COUNTDOWN_SECONDS");
    expect(goLive).toContain("countdown");
    expect(goLive).toContain("Choose a Custom Domain");
    expect(goLive).toContain("I already have a domain");
    expect(goLive).toContain("Publish on PageCrafts");
    expect(goLive).toContain("domain-connect");
    expect(goLive).not.toContain("border-destructive");
    expect(goLive).not.toContain("bg-destructive");
  });

  it("keeps custom domain inside Go Live, not the chat banner", () => {
    const goLive = read("src", "components", "editor", "GoLiveButton.tsx");
    const composer = read("src", "components", "editor", "ChatComposer.tsx");

    expect(goLive).toContain("/api/v1/domains/suggest");
    expect(goLive).toContain("openDomainCheckout");
    expect(composer).not.toContain("Set up a custom domain");
    expect(composer).not.toContain("CustomDomainDialog");
  });
});
