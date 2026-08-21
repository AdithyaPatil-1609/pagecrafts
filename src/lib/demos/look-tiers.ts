/**
 * Fixed restaurant demos for Compare slide /compare — Starter / Pro / Premium look differences.
 * Mirrors Pick-a-look: casual→Starter, photos→Pro, motion→Premium (chrome + feel).
 * Not live AI output; a recorded reference of pages + features per design tier.
 */

import {
    chromeHeaderHtml,
    navLinksHtml,
    tierChromeCss,
} from "@/lib/sites/tier-chrome-markup";
import type { ChromeKind } from "@/lib/sites/tier-chrome";

export type CompareLookId = "starter" | "pro" | "premium";

export const DEMO_BRAND = {
    name: "Harbour House",
    place: "Fort Kochi",
    tagline: "Seafood by the water.",
    domain: "harbourhouse.in",
} as const;

export const COMPARE_LOOKS: {
    id: CompareLookId;
    /** Internal style id used by generation (kept for entitlements). */
    styleId: "casual" | "photos" | "motion";
    label: string;
    priceInr: number;
    chrome: ChromeKind;
    pages: string[];
    features: string[];
    blurb: string;
}[] = [
    {
        id: "starter",
        styleId: "casual",
        label: "Starter",
        priceInr: 0,
        chrome: "sidebar",
        pages: ["Home", "Menu", "About", "Contact"],
        features: [
            "Sidebar with every page listed",
            "Simple image hero",
            "Clear menu grid",
            "Phone + WhatsApp contact",
        ],
        blurb: "Sidebar pages and a simple image hero — clear and free.",
    },
    {
        id: "pro",
        styleId: "photos",
        label: "Pro",
        priceInr: 499,
        chrome: "topbar",
        pages: ["Home", "Menu", "Gallery", "Private dining", "About", "Contact"],
        features: [
            "Blended sticky top bar",
            "Cinematic photo hero",
            "Separate photo-led pages",
            "Gallery + private dining",
        ],
        blurb: "Photo-rich cinematic hero, blended top bar, separate pages.",
    },
    {
        id: "premium",
        styleId: "motion",
        label: "Premium",
        priceInr: 999,
        chrome: "liquid",
        pages: ["Home", "Story", "Menu", "Gallery", "Reservations", "Contact"],
        features: [
            "Liquid continuous scroll",
            "Bloom atmosphere + display type",
            "Smooth section-to-section flow",
            "Reservations / order CTA built in",
        ],
        blurb: "Liquid PageCrafts-like deck — blooms, type, continuous scroll.",
    },
];

const IMG = {
    hero: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=70&auto=format&fit=crop",
    plate: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=70&auto=format&fit=crop",
    room: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=70&auto=format&fit=crop",
    water: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=70&auto=format&fit=crop",
};

function doc(title: string, css: string, body: string): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;650;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet"/>
<style>
${css}
</style>
</head>
<body>
${body}
<script>
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
  if (!a) return;
  var id = a.getAttribute('href').slice(1);
  var el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
</script>
</body>
</html>`;
}

function starterHtml(): string {
    const nav = navLinksHtml([
        { href: "#home", label: "Home", current: true },
        { href: "#menu", label: "Menu" },
        { href: "#about", label: "About" },
        { href: "#contact", label: "Contact" },
    ]);
    const header = chromeHeaderHtml({
        kind: "sidebar",
        title: DEMO_BRAND.name,
        homeHref: "#home",
        navInner: nav,
    });
    const css = `
:root { --bg:#f7f4ef; --ink:#1c1917; --muted:#78716c; --accent:#b45309; --panel:#fff; --rule:#e7e5e4; }
* { box-sizing: border-box; }
body { margin:0; font-family:"Source Sans 3",system-ui,sans-serif; background:var(--bg); color:var(--ink); }
h1,h2 { font-family:Outfit,system-ui,sans-serif; letter-spacing:-0.02em; }
img { max-width:100%; display:block; }
.site-main { padding:1.5rem; }
.hero { display:grid; gap:1rem; }
.hero img { width:100%; min-height:14rem; object-fit:cover; }
.hero h1 { font-size:clamp(1.8rem,4vw,2.6rem); margin:0.4rem 0; }
.muted { color:var(--muted); }
.grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.75rem; margin-top:1rem; }
.card { background:var(--panel); border:1px solid var(--rule); padding:0.75rem; }
.card strong { display:block; margin-top:0.4rem; }
.section { padding:2rem 0; border-top:1px solid var(--rule); }
.cta { display:inline-block; margin-top:0.75rem; padding:0.55rem 1rem; background:var(--accent); color:#fff; text-decoration:none; border-radius:999px; font-weight:600; font-size:0.9rem; }
${tierChromeCss("sidebar")}
`;
    const body = `<div class="site-shell">
${header}
<main class="site-main">
  <section class="hero" id="home">
    <img src="${IMG.hero}" alt="Plated seafood at Harbour House"/>
    <div>
      <p class="muted">${DEMO_BRAND.place}</p>
      <h1>${DEMO_BRAND.tagline}</h1>
      <p class="muted">Catch of the day, grilled simply, served overlooking the harbour.</p>
      <a class="cta" href="#menu">See tonight's menu</a>
    </div>
  </section>
  <section class="section" id="menu">
    <h2>Menu</h2>
    <p class="muted">Four plates you can order this evening.</p>
    <div class="grid">
      <article class="card"><img src="${IMG.plate}" alt=""/><strong>Pepper crab</strong><span class="muted">Rs 890</span></article>
      <article class="card"><img src="${IMG.water}" alt=""/><strong>Catch curry</strong><span class="muted">Rs 640</span></article>
      <article class="card"><img src="${IMG.room}" alt=""/><strong>Coastal platter</strong><span class="muted">Rs 1,280</span></article>
      <article class="card"><img src="${IMG.hero}" alt=""/><strong>Toddy prawns</strong><span class="muted">Rs 720</span></article>
    </div>
  </section>
  <section class="section" id="about">
    <h2>About</h2>
    <p class="muted">Harbour House began as a family kitchen on the Fort Kochi waterfront. We keep the menu short and the fish honest.</p>
  </section>
  <section class="section" id="contact">
    <h2>Contact</h2>
    <p class="muted">Call +91 98xxx xxx21 · WhatsApp for a table tonight.</p>
    <a class="cta" href="#contact">Message us</a>
  </section>
</main>
</div>`;
    return doc(`${DEMO_BRAND.name} · Starter`, css, body);
}

function proHtml(): string {
    const nav = navLinksHtml([
        { href: "#home", label: "Home", current: true },
        { href: "#menu", label: "Menu" },
        { href: "#gallery", label: "Gallery" },
        { href: "#private", label: "Private dining" },
        { href: "#about", label: "About" },
        { href: "#contact", label: "Contact" },
    ]);
    const header = chromeHeaderHtml({
        kind: "topbar",
        title: DEMO_BRAND.name,
        homeHref: "#home",
        navInner: nav,
    });
    const css = `
:root { --bg:#faf8f5; --ink:#1c1917; --muted:#6b6560; --accent:#0f766e; --panel:#fff; --rule:#e8e4de; }
* { box-sizing: border-box; }
body { margin:0; font-family:"Source Sans 3",system-ui,sans-serif; background:var(--bg); color:var(--ink); }
h1,h2 { font-family:Outfit,system-ui,sans-serif; letter-spacing:-0.03em; }
a { color:inherit; }
.wrap { max-width:68rem; margin:0 auto; padding:0 1.25rem 3rem; }
.hero {
  position:relative; min-height:72vh; display:flex; align-items:flex-end;
  background: url('${IMG.hero}') center/cover no-repeat; color:#fff; margin:0 -1.25rem 2rem;
}
.hero::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 20%,rgba(0,0,0,.72)); }
.hero-inner { position:relative; z-index:1; padding:2.5rem 1.5rem; max-width:28rem; }
.hero h1 { font-size:clamp(2.2rem,5vw,3.4rem); margin:0.35rem 0; }
.muted { color:var(--muted); }
.hero .muted { color:rgba(255,255,255,.82); }
.section { padding:2.5rem 0; border-top:1px solid var(--rule); }
.masonry { display:grid; grid-template-columns:1.1fr 0.9fr; gap:0.85rem; }
.masonry img { width:100%; height:100%; object-fit:cover; min-height:11rem; border-radius:0.75rem; }
.row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:0.85rem; }
.card { background:var(--panel); border-radius:0.85rem; overflow:hidden; border:1px solid color-mix(in srgb,var(--rule) 80%, transparent); }
.card img { width:100%; height:9rem; object-fit:cover; }
.card .pad { padding:0.85rem; }
.cta { display:inline-block; margin-top:0.9rem; padding:0.6rem 1.1rem; background:var(--accent); color:#fff; text-decoration:none; border-radius:999px; font-weight:650; font-size:0.9rem; }
@media (max-width:48rem) { .masonry,.row { grid-template-columns:1fr; } }
${tierChromeCss("topbar")}
`;
    const body = `${header}
<div class="wrap">
  <section class="hero" id="home">
    <div class="hero-inner">
      <p class="muted">${DEMO_BRAND.place} · harbour dining</p>
      <h1>${DEMO_BRAND.tagline}</h1>
      <p class="muted">Cinematic plates photographed on real light — separate pages, a soft top bar that stays out of the way.</p>
      <a class="cta" href="#gallery">Open the gallery</a>
    </div>
  </section>
  <section class="section" id="gallery">
    <h2>Gallery</h2>
    <p class="muted">Blended top bar — scroll without losing where you are.</p>
    <div class="masonry" style="margin-top:1rem">
      <img src="${IMG.plate}" alt=""/>
      <img src="${IMG.water}" alt=""/>
      <img src="${IMG.room}" alt=""/>
      <img src="${IMG.hero}" alt=""/>
    </div>
  </section>
  <section class="section" id="menu">
    <h2>Menu</h2>
    <div class="row" style="margin-top:1rem">
      <article class="card"><img src="${IMG.plate}" alt=""/><div class="pad"><strong>Pepper crab</strong><p class="muted">Rs 890</p></div></article>
      <article class="card"><img src="${IMG.water}" alt=""/><div class="pad"><strong>Catch curry</strong><p class="muted">Rs 640</p></div></article>
      <article class="card"><img src="${IMG.room}" alt=""/><div class="pad"><strong>Coastal platter</strong><p class="muted">Rs 1,280</p></div></article>
    </div>
  </section>
  <section class="section" id="private">
    <h2>Private dining</h2>
    <p class="muted">A harbour-view room for twelve. We plate the catch you choose and keep service unhurried.</p>
  </section>
  <section class="section" id="about">
    <h2>About</h2>
    <p class="muted">A Fort Kochi restaurant for people who want fewer dishes, cooked well.</p>
  </section>
  <section class="section" id="contact">
    <h2>Contact</h2>
    <p class="muted">Tables by appointment · +91 98xxx xxx21</p>
    <a class="cta" href="#contact">Book a table</a>
  </section>
</div>`;
    return doc(`${DEMO_BRAND.name} · Pro`, css, body);
}

function premiumHtml(): string {
    const nav = navLinksHtml([
        { href: "#home", label: "Home", current: true },
        { href: "#story", label: "Story" },
        { href: "#menu", label: "Menu" },
        { href: "#gallery", label: "Gallery" },
        { href: "#reservations", label: "Reservations" },
        { href: "#contact", label: "Contact" },
    ]);
    const header = chromeHeaderHtml({
        kind: "liquid",
        title: DEMO_BRAND.name,
        homeHref: "#home",
        navInner: nav,
    });
    const css = `
* { box-sizing: border-box; }
body { margin:0; font-family:"Source Sans 3",system-ui,sans-serif; }
.muted { color:var(--liquid-muted); }
.hero-copy { max-width:18ch; }
.hero-copy h1 { font-size:clamp(2.8rem,7vw,4.8rem); margin:0.4rem 0; }
.slide-grid { display:grid; grid-template-columns:1.05fr 0.95fr; gap:1.5rem; align-items:center; }
.slide-grid img { width:100%; border-radius:1rem; min-height:16rem; object-fit:cover; }
.chips { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:1rem; }
.chip { border:1px solid color-mix(in srgb,var(--bloom-sky) 35%, transparent); border-radius:999px; padding:0.35rem 0.75rem; font-size:0.85rem; color:var(--liquid-muted); }
.row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:0.85rem; margin-top:1.25rem; }
.row article { background:color-mix(in srgb,#0b121e 70%, transparent); border:1px solid color-mix(in srgb,var(--bloom-sky) 18%, transparent); border-radius:1rem; overflow:hidden; }
.row img { width:100%; height:9rem; object-fit:cover; }
.row .pad { padding:0.9rem; }
@media (max-width:48rem) { .slide-grid,.row { grid-template-columns:1fr; } }
${tierChromeCss("liquid")}
`;
    const body = `<div class="site-liquid">
${header}
<div class="liquid-deck">
  <section class="liquid-slide" id="home">
    <div class="hero-copy">
      <p class="muted">${DEMO_BRAND.place}</p>
      <h1>${DEMO_BRAND.tagline}</h1>
      <p class="muted">Premium liquid flow — one continuous scroll through the evening, not a stack of hard cuts.</p>
      <a class="cta" href="#story" style="display:inline-block;margin-top:1rem;padding:0.65rem 1.2rem;text-decoration:none">Enter the story</a>
    </div>
  </section>
  <section class="liquid-slide" id="story">
    <div class="slide-grid">
      <div>
        <h2>Story</h2>
        <p class="muted">Net, grill, and table on the same waterfront. You taste the catch before you sit down.</p>
        <div class="chips"><span class="chip">Day boat</span><span class="chip">Open fire</span><span class="chip">Harbour light</span></div>
      </div>
      <img src="${IMG.water}" alt=""/>
    </div>
  </section>
  <section class="liquid-slide" id="gallery">
    <h2>Gallery</h2>
    <p class="muted">Soft page-to-page motion — scroll, don’t jump.</p>
    <div class="slide-grid" style="margin-top:1.25rem">
      <img src="${IMG.plate}" alt=""/>
      <img src="${IMG.room}" alt=""/>
    </div>
  </section>
  <section class="liquid-slide" id="menu">
    <h2>Menu</h2>
    <div class="row">
      <article><img src="${IMG.plate}" alt=""/><div class="pad"><strong>Pepper crab</strong><p class="muted">Rs 890</p></div></article>
      <article><img src="${IMG.water}" alt=""/><div class="pad"><strong>Catch curry</strong><p class="muted">Rs 640</p></div></article>
      <article><img src="${IMG.room}" alt=""/><div class="pad"><strong>Coastal platter</strong><p class="muted">Rs 1,280</p></div></article>
    </div>
  </section>
  <section class="liquid-slide" id="reservations">
    <h2>Reservations</h2>
    <p class="muted">Pick a time, pay a deposit over UPI on your phone, we confirm on WhatsApp — booking built into the site.</p>
    <a class="cta" href="#reservations" style="display:inline-block;margin-top:1rem;padding:0.65rem 1.2rem;text-decoration:none">Reserve a table</a>
  </section>
  <section class="liquid-slide" id="contact">
    <h2>Contact</h2>
    <p class="muted">Waterfront · ${DEMO_BRAND.place} · +91 98xxx xxx21</p>
  </section>
</div>
</div>`;
    return doc(`${DEMO_BRAND.name} · Premium`, css, body);
}

export function lookTierPreviewHtml(look: CompareLookId): string {
    if (look === "pro") return proHtml();
    if (look === "premium") return premiumHtml();
    return starterHtml();
}
