# R2 week 4 — Discovery & Templates (D16–D20), Pragna's track

Written at D15 · 16:00, against the D20 milestone exit.

**D20 exit:** beta launch — the first ten seconds look intentional, the core flow is
keyboard-navigable, the accessibility baseline is met.

## The schedule's template days no longer apply

D16 and D17 are written as "templates 19–20, 21–22, 23–24, 25" against a 25-template floor.
**The library holds 115 designs.** Those four blocks are done several times over, and
spending week 4 adding a 116th would be the least valuable thing available.

What the schedule was protecting is still real, though, and it is *not* done — the licence
audit, the attribution check and the thumbnails were all scoped to 25 designs and now have
115 to cover. That is where those days go.

| Schedule says | What week 4 actually needs |
| --- | --- |
| Templates 19–25 | Nothing. Floor cleared 90 designs ago. |
| Full licence audit (25) | Same audit, 115 designs, and it has never run |
| Attribution rendering audit | Same, and now spans nine mockup batches |
| Thumbnail generation + regen | **Zero thumbnails exist.** `public/templates/` is empty |

## Where D15 left things

| | State |
| --- | --- |
| Mobile | No horizontal overflow on landing, describe, gallery or editor at 375px; filter chips and the sign-in link resized to thumb targets |
| Meera's path | Walked end to end in one sequence — fork, edit, photo, form, gate, build — and asserted |
| Publish output | Her words, her photo, her form, her meta; attribution intact; republish updates |
| Library | 115 designs, every one with a non-null licence and source URL |
| Thumbnails | None. `thumbnailUrl` reports null rather than a URL that 404s |

## The week

### D16 · The licence audit, at its real size
- All 115 designs: licence and `source_url` non-null, and *verifiably* permissive. The
  non-null part is already enforced by `validateTemplate` and tested; what has never been
  done is a human confirming the licence is what the record claims.
- Every design currently records `MIT` with a `source()` URL pointing at a path in this
  repo. For designs generated from blueprints that is honest — they are first-party. For
  anything sourced it must name the real upstream, or be removed (C-06).
- Produce the provenance ledger the schedule asks for at D18: design → source → licence.

**Watch:** this is the audit that can only fail late. If a design cannot be traced, it comes
out of the library, and that is a gallery change on the eve of launch.

### D17 · Category coverage, and the taxonomy decision — **done**
- Every intent category needs designs behind it, and at least one free design per category —
  a category with only paid designs is a dead end (Doc 22 P1).
- **Then make the taxonomy call**, which has been open since the second batch: Health &
  Wellness / Wellness / Health are three buckets, Retail / E-commerce are two, and Tech
  Company sits in Business while IT Consulting sits in Technology. Nobody browsing reads
  those as distinct shelves. Collapsing them is a product decision and it should be made
  before launch, not after the first person filters and finds three near-identical chips.

**What the measurement found.** No empty shelves and nothing orphaned — but two dead ends:
`architecture` held one design at Rs 999 and `agency` one at Rs 499, so picking either card
left paying as the only way forward. Ten of the thirty-five shelves held exactly one design.

**Decided and applied.** The clear duplicates are folded:

| Folded | Into | Why |
| --- | --- | --- |
| `agency` | `business` | one design literally named "Agency", beside Marketing Agency, Digital Agency, Recruitment Agency and Recruitment Firm |
| `wellness` | `health_wellness` | a counsellor, beside a yoga studio and a spa |
| `health` | `health_wellness` | a nutritionist, same shelf |
| `retail` | `store` | a bookshop and a florist, beside fourteen shops |

Plus "Tech Company" moved from `business` to `technology`, where the other five tech designs
already were. Thirty-five shelves became thirty-one, and no design left the library.

The enum values stay and resolve through `CATEGORY_ALIASES`, so `?category=retail` still
filters — to E-commerce, where its designs went. Removing the values would have broken a
bookmarked link, the classifier's output and the database's own type, all for a change that
is only about what a person sees.

**Dead ends cleared.** The `agency` fold absorbed one. Architecture is now free, which is
what took the last one out: 110 of 115 designs are free, so the paid tier was carrying five
designs and two of them were the only thing on their shelf. `tests/unit/category-coverage.test.ts`
holds the rule from here — a card with no design, a card with no free design, or a design
stored on a shelf with no card all fail the build.

**Not done, and deliberately.** The ten single-design shelves are left alone. Folding them
would mean judging that Nonprofit belongs inside Business or that Media belongs inside
Entertainment, and those read as different shelves to the person choosing even though the
library is thin behind them. A thin shelf is honest; a wrong shelf is not.

### D18 · Thumbnails
- `scripts/render-thumbnails.ts` exists and `public/templates/` is empty. Generate for all
  115, into Supabase Storage, at consistent framing and size.
- Point `thumbnailUrlFor` at the bucket once they exist; it returns null today precisely so
  no caller renders a broken image before then.
- Re-check gallery first paint afterwards. 115 tiles currently draw a parsed miniature each;
  swapping to images changes the performance profile in both directions and should be
  measured, not assumed.

### D19 · Visual polish, copy, and the freeze
- Consistency pass across discovery and the editor: spacing, type, colour.
- Copy audit against UI Spec §7.18 — never a technical word, one clear action per screen,
  prices in rupees before any choice. The mojibake found in a live string at R3 D15 says
  this pass should also check for encoding damage, not only wording.
- Empty and first-run states.
- Day-19 freeze: polish and configuration only.

### D20 · Accessibility baseline and launch
- axe-core across discovery and the content panel; fix critical and serious.
- The core flow keyboard-completable with visible focus. Partly built in already — tiles are
  real buttons, chips carry `aria-pressed` — but it has never been walked end to end with
  only a keyboard, and the automation available here cannot do it. **This one needs a
  person.**
- Launch landing, then watch the funnel without shipping.

## Carried in

1. **No thumbnails at all.** The largest single gap on this track. D18.
2. ~~**The taxonomy decision**, four weeks open.~~ Made at D17; see above.
3. ~~**The licence audit has never run**~~ — ran at D16. It found all 115 designs recording a
   source URL for a repository that has never existed, and the detail modal telling customers
   a first-party design "comes from open source". Both fixed. **Still open from it:** the repo
   has no LICENSE file, so the `MIT` on 115 designs is a claim the project has not made
   anywhere. Either add the LICENSE or change the recorded value.
4. **The editor was not auditable on mobile** at D15 — it needs a signed-in session, so the
   content panel at 375px is still unverified. Worth ten minutes with a real account before
   D20 rather than discovering it at launch.
5. **Ten shelves hold one design each** — resume, architecture, professional_services,
   nonprofit, media, arts_culture, personal and three more. Not a fault, and folding them
   would misfile designs to flatter a count. But if D18's thumbnails make thin shelves look
   thin, this is the lever.
