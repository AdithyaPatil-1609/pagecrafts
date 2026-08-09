# R2 week 2 — Discovery + Templates (D6–D10)

Written at D5 · 16:00, against the D10 milestone exit.

**D10 exit:** the core loop closes — a user filters 18 real templates, edits a heading in the
content panel, and the preview updates.

Two things have to be true by Friday: eighteen real templates in the library, and a content
panel that edits one of them. Everything below is in service of those.

## Where D5 left things

| | State |
| --- | --- |
| Library | 12 real templates, all schema-valid with non-null licence + source_url |
| Gallery | reads the local registry (`TEMPLATES`); ranks by Hanish's deterministic score when a description was classified |
| Detail modal | screen 05, from `GET /templates/{id}`, price beside the CTA |
| Content panel | **not started** — the largest piece of week 2 |
| Filters | none yet; sort only (recommended / free / premium / name) |

The one change point for the live API: `src/app/templates/page.tsx` imports `TEMPLATES`
directly. That import is what D6 replaces.

## The week

### D6 · Gallery on real data
- `GET /templates` with the real query params (category, colour, layout, feature, tier, q,
  sort=recommended). Server-side, so the score stays deterministic and shared.
- Every tile renders its price tag — Free / Rs 499 / Rs 999. `PriceBadge` was built at D4
  and is waiting for this; the gallery has been deliberately price-free until now, which
  UI Spec §7.5 wants ended here.
- Loading, empty and error states on the gallery.
- Thumbnails from Supabase Storage, lazy-loaded, first paint under 1.5s on throttled 4G.
- Templates 11–13. **We are already at 12**, so this is 13 and a head start on D7.

**Watch:** the score currently computed in the page moves behind the API. The ordering must
not change when it moves — the D5 ranking tests are the check for that, and they should
still pass unmodified afterwards.

### D7 · Filter chips + URL state
- Combinable chips: category, colour, layout, feature, price. Individually clearable.
- Filter and query state mirrored in the URL; back/forward and reload restore the exact
  gallery. `preserve` in the gallery page already does this for sort, category and intent —
  the chips extend it rather than replace it.
- No-results state with a reset, and a "showing N of M" count.
- Templates 14–15.

**Watch:** the price chip has to isolate free designs, and every category needs at least one
free design or the chip combination produces a dead end. That check is D17's, but the shape
of it should be visible by D7.

### D8 · Content panel v1 + site metadata
The week's centre of gravity. It starts from work already done: `content_schema` is
authored to documented conventions (D4) and enforced by `checkConventions`, so the panel can
be generated from the schema alone with no per-template code (C-07).

- Scaffold screen 07: render an input per field, mapping each `FieldType` to a control.
- Wire edits to `PATCH /projects/{id}/content` with ops `[{path, value}]`; on success the
  preview re-renders.
- Site metadata fields — title, description, favicon, og image — against `site_meta`.
- Templates 16–17.

**Watch:** the panel is generated from `content_schema` and nothing else. The first time a
template seems to need its own control, that is a `FieldType` to add, not a special case —
the conventions doc says so and the tests enforce it.

### D9 · FieldType coverage + validation
- Implement every `FieldType` the current schemas use: text, richtext, image, color, select,
  and the repeatable list (full add/remove/reorder is D11).
- Zod validation of edits against `content_schema` — required fields, max lengths — with
  inline errors. The caps are already authored per field, so this is wiring, not deciding.
- Image slots open an asset picker placeholder; real Unsplash search is D12.
- Template 18 — the week-2 floor.

### D10 · Milestone
- Gallery, chips and URL state verified across all 18 templates with accurate counts.
- Content-panel acceptance: edit a heading, `content_json` patches, preview updates.
- Bug sweep, plus a provenance spot-check that all 18 still carry licence + source_url.
- Plan week 3.

## Template pacing

Twelve now, eighteen by Friday: six across four days.

| Day | Target | Cumulative |
| --- | --- | --- |
| D6 | 13 | 13 |
| D7 | 14–15 | 15 |
| D8 | 16–17 | 17 |
| D9 | 18 | 18 |

The normaliser (D4) is the way in: `npm run templates:normalise -- <source-dir>` refuses
anything without a verified licence, so the provenance rule holds itself. Sourcing is the
slow part, not normalising — find the sources before the day they are due.

## Dependencies

| Need | From | When |
| --- | --- | --- |
| `GET /templates` returning tier + score | Backend | D6, first thing |
| `rankTemplates` behind the endpoint | Hanish | D6 |
| `PATCH /projects/{id}/content` | R3 persistence (shipped D3) | D8 |
| Preview that re-renders on content change | Preethi | D8 |
| Supabase Storage bucket for thumbnails | Adithya | D6 |

Gemini billing was due at D5 (Adithya). Classification is what the describe path needs, and
on the free tier it measures 20 requests a day for the whole team — enough to demo, not
enough to test the gallery's ranking against real descriptions. If billing has not landed,
D6's ranking work gets tested against hand-written intent URLs instead, which is what D5's
tests already do.

## Known seams carried into week 2

1. **"Use this design" parks at `/new?template=<id>`.** It cannot fork yet:
   `createProjectSchema` wants `sourceTemplateId` as a uuid and library ids are slugs
   (`gym`, `portfolio`). This closes at D6 when templates come from the table and have real
   ids. Until then the detail modal's CTA is a signpost, not a fork.

2. **Two of the six describe-screen cards have no design of their own** — E-commerce and
   Other. They fall through to the whole library rather than an empty grid, which is
   deliberate and now pinned by a test. Worth resolving properly as the library grows to 25:
   either ship a store design or change the card.

3. **The gallery ranks but shows no relevance cue.** A design scoring zero sits below one
   scoring fifty with nothing to say so. D6's "optional score/relevance cues" is where that
   gets decided — with no fake precision.
