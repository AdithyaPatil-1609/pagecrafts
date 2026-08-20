import { describe, expect, it } from "vitest";

import { personaliseContent, personaliseFiles } from "@/lib/content/personalise";
import { mergeRewrittenCopy } from "@/lib/ai/edit/rewrite-copy";
import type { ContentSchema } from "@/lib/contracts";

const SCHEMA: ContentSchema = {
  sections: [
    {
      key: "hero",
      label: "Hero",
      fields: [
        { key: "headline", label: "Headline", type: "text", maxLength: 60 },
        { key: "subhead", label: "Subheading", type: "text", maxLength: 140 },
        { key: "image", label: "Photo", type: "image" },
      ],
    },
    {
      key: "site",
      label: "Site",
      fields: [
        { key: "name", label: "Site name", type: "text", maxLength: 40 },
        { key: "footer", label: "Footer", type: "text", maxLength: 120 },
      ],
    },
    {
      key: "visit",
      label: "Visit",
      fields: [
        { key: "heading", label: "Heading", type: "text", maxLength: 60 },
        { key: "phone", label: "Phone", type: "text", maxLength: 20 },
      ],
    },
  ],
};

const CURRENT = {
  hero: { headline: "Stronger every day.", subhead: "Train hard." },
  site: { name: "Gym", footer: "Built with PageCraft." },
  visit: { heading: "Come by", phone: "" },
};

const FACTS = {
  name: "Ironworks",
  offer: "Strength gym and coaching",
  place: "Pune",
  phone: "9876543210",
};

describe("personaliseContent", () => {
  it("puts the business name, place and offer onto the design, not a new layout", () => {
    const next = personaliseContent(SCHEMA, CURRENT, FACTS);

    expect(next.hero?.headline).toBe("Ironworks");
    expect(next.hero?.subhead).toBe("Strength gym and coaching in Pune");
    expect(next.site?.name).toBe("Ironworks");
    expect(next.site?.footer).toBe("Ironworks · Pune");
    expect(next.visit?.phone).toBe("9876543210");
    expect(next.visit?.heading).toBe("Come by");
  });

  it("leaves a phone blank when none was given", () => {
    const next = personaliseContent(SCHEMA, CURRENT, {
      name: "Ironworks",
      offer: "Strength gym",
      place: "Pune",
    });
    expect(next.visit?.phone).toBe("");
  });

  it("writes those words into the HTML slots", () => {
    const html = `<h1 data-slot="hero.headline">Stronger every day.</h1>
<p data-slot="hero.subhead">Train hard.</p>
<title>Gym</title>`;
    const content = personaliseContent(SCHEMA, CURRENT, FACTS);
    const files = personaliseFiles({ "index.html": html, "styles.css": "body{}" }, SCHEMA, content, FACTS);

    expect(files["index.html"]).toContain("Ironworks");
    expect(files["index.html"]).toContain("Strength gym and coaching in Pune");
    expect(files["index.html"]).toContain("<title>Ironworks</title>");
    expect(files["styles.css"]).toBe("body{}");
  });
});

describe("mergeRewrittenCopy", () => {
  it("keeps unknown and image fields off the page", () => {
    const next = mergeRewrittenCopy(SCHEMA, CURRENT, {
      hero: { headline: "Lift with us", image: "https://evil.example/x.jpg" },
      mystery: { heading: "nope" },
    });

    expect(next.hero?.headline).toBe("Lift with us");
    expect(next.hero?.image).toBeUndefined();
    expect(next.site?.name).toBe("Gym");
    expect(next).not.toHaveProperty("mystery");
  });
});
