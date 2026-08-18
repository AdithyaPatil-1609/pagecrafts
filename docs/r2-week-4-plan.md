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

### D18 · Thumbnails — **done**
- `scripts/render-thumbnails.ts` exists and `public/templates/` is empty. Generate for all
  115, into Supabase Storage, at consistent framing and size.
- Point `thumbnailUrlFor` at the bucket once they exist; it returns null today precisely so
  no caller renders a broken image before then.
- Re-check gallery first paint afterwards. 115 tiles currently draw a parsed miniature each;
  swapping to images changes the performance profile in both directions and should be
  measured, not assumed.

**The existing script was the wrong one.** `scripts/render-thumbnails.ts` renders the AI
catalogue's drafts out of `evals/catalogue/`; it has never had anything to do with the design
library. `scripts/render-template-thumbnails.ts` (`npm run templates:thumbs`) is the one that
was missing: Chromium is shown each design's own index.html with its own stylesheet inlined,
screenshotted at 1280×800 and written as 640×400 WebP. **115 files, 1.62 MB, 14.4 KB average,
31 KB largest**, with per-file and total budgets the script exits non-zero on.

**They live in `public/templates/`, not Supabase Storage.** Not because there are no
credentials here — because it is better: the thumbnail and the design move in the same
commit, so the picture cannot drift from what it depicts, which is the one real cost a
rendered image has over the parsed miniature. No bucket policy, no egress, nothing to rotate,
and a design change is reviewable as a picture in the diff. `thumbnailUrlFor` still prefers
`NEXT_PUBLIC_TEMPLATE_THUMBNAIL_BASE` when it is set, so moving them is one variable.

**Measured, and the measurement found a bug first.** Taking the baseline showed every tile
requesting `?w=480&amp%3Bq=70&amp%3Bauto=format&amp%3Bfit=crop`. `heroImageOf` lifts the src
out of markup with a regex and never decoded the entities, so `&amp;q` became a parameter
named `amp;q` — `q=70`, `auto=format` and `fit=crop` were being dropped from **all 115
tiles**. On one of the library's own photographs that is 47.6 KB of JPEG where the intended
URL returns 29.6 KB of AVIF.

| | Before | After |
| --- | --- | --- |
| Gallery HTML, decoded | 1,125,821 B | 503,841 B (−55%) |
| Gallery HTML, gzipped | 87,864 B | 39,962 B (−55%) |
| DOM nodes | 3,669 | 1,524 (−58%) |
| Images | 115 third-party, mis-parameterised | 115 same-origin WebP |
| Requests to images.unsplash.com | up to 115 | 0 |

Lazy loading was already right: 4 eager above the fold, 111 lazy.

A design with no rendered thumbnail still gets `null` and still draws its miniature, so
adding a design without re-running the renderer degrades one tile rather than breaking the
page — and a test fails until somebody runs it.

### D19 · Visual polish, copy, and the freeze — **done**
- Consistency pass across discovery and the editor: spacing, type, colour.
- Copy audit against UI Spec §7.18 — never a technical word, one clear action per screen,
  prices in rupees before any choice. The mojibake found in a live string at R3 D15 says
  this pass should also check for encoding damage, not only wording.
- Empty and first-run states.
- Day-19 freeze: polish and configuration only.

**The encoding sweep found worse than mojibake.** `src/lib/data/validate-file-map.ts` had
`const NUL = /<U+FFFD>/` — a literal replacement character, the replacement character an editor writes when it
saves a byte it cannot decode, not `\0`. So the guard named NUL matched the wrong character:
**a path containing a real NUL byte passed `isValidFilePath`**, while a harmless pasted
replacement character was refused. Proven both ways before fixing. Nothing was ever stored
with one — the database's `position(chr(0) in path) = 0` CHECK refused it — so what was lost
is the clean 422 this function exists to give. Written as an escape now, so no future save
can mangle it back.

**"Something went wrong" was in six customer-facing strings.** It is the phrase §7.18 exists
to prevent: it names nothing and offers nothing. Rewritten to say what happened and what is
still true — sign-in, password reset, the gallery error, the shared API message, `error.tsx`
and `global-error.tsx`.

**The last-resort screen was the wrong product.** `global-error.tsx` — the one shown when
even the root layout has failed — rendered white with near-black text, in a product whose
identity is dark-first. It cannot use tokens (globals.css is exactly what may not have
loaded), so the palette values are inlined, named, and commented with why they must be kept
in step by hand.

**The audit is a test now**, `tests/unit/copy-audit.test.ts`, and it caught its own blind
spot: the first version's JSX-text pattern excluded newlines, so it walked straight past the
two multi-line paragraphs — including the one on the crash screen. Both self-check against
the strings they exist for, so neither can quietly stop working.

**Empty states hold up.** Filtering to nothing gives a heading, a sentence, and two ways out;
the funnel is not a dead end anywhere (D-6). Two fixes: the empty state carries `role="status"`
so the grid emptying is announced rather than silent, and the count heading had a `gap`
between flex children but no space in the text stream, so it read "0 designs to start
fromof 115" to a screen reader.

**Tokens are otherwise clean.** Thirteen raw hex values across the app, and twelve of them
are right: Google's brand colours inside their own logo SVG, a colour picker's placeholder
and fallback, and a gradient built from a template's own palette. The thirteenth was
`global-error.tsx`, above. No `rgba()`, no hand-rolled brand gradient.

**Noted, not changed during a freeze:** `text-[11px]` appears five times and `text-[10px]`
three, which is a token wanting to exist. Eight call sites is not a freeze-day change.

### D20 · Accessibility baseline and launch — **done**
- axe-core across discovery and the content panel; fix critical and serious.
- The core flow keyboard-completable with visible focus. Partly built in already — tiles are
  real buttons, chips carry `aria-pressed` — but it has never been walked end to end with
  only a keyboard, and the automation available here cannot do it. **This one needs a
  person.**
- Launch landing, then watch the funnel without shipping.

**Three findings, one of them from the sentence above.** "Chips carry `aria-pressed`" was
written as evidence that keyboard access was partly built in. It was the critical violation:
`aria-pressed` is only defined for a button and these are links, so an unsupported attribute
meant *no* announcement — the active filter was conveyed by colour and nothing else, on all
forty chips. `aria-current` now carries the state, and what it cannot carry — that pressing
again clears the filter — is in the accessible name as words.

**The brand red fails as small text.** `#dc2626` on the near-black surface is 4.06:1 against
the 4.5:1 AA asks for. Lightening `--primary` would have fixed the text and broken the
buttons: white on red-500 is 3.76:1. They are two jobs, so there is a `--brand-ink` token
now — red-500 on dark, red-600 unchanged on light, both clear — used where brand red is
words. Fills, borders and icons stay on `--primary`, which already clears the 3:1 an icon
needs.

**The landing page's "How it works" sat outside every landmark**, so seven pieces of content
were unreachable by region navigation on the first screen a customer sees.

**The keyboard walk was done, and the D15 note was too pessimistic.** The in-app browser
cannot deliver real key events — the pane does not composite, so `visibilityState` is
hidden — but Playwright can, and does. `e2e/a11y.spec.ts` tabs through the gallery with the
browser's own sequencing, checks every stop paints a visible indicator, opens a design with
Enter, tabs ten times inside the dialog without escaping it, and presses Escape to confirm
focus returns to the tile it came from. Ten tests, in CI, unauthenticated so they need no
credential.

**What still needs a person, precisely.** Not the tab order and not the focus ring — those
are covered above. What no automation here can do is listen: whether the announcements make
sense in sequence, whether the gallery is comprehensible through a screen reader rather than
merely conformant, and whether the reading order matches the visual one in a way that feels
right. Half an hour with VoiceOver or NVDA before launch.

**Also owed:** the editor's content panel is not in the axe sweep. It needs a session, so it
is gated with the rest of the signed-in specs behind `E2E_WITH_AUTH`, which CI has no
credential for — the same gap as the cross-user spec on the R3 track.

## Carried in

1. ~~**No thumbnails at all.**~~ Rendered at D18: 115 WebP in `public/templates/`,
   regenerated with `npm run templates:thumbs`.
2. ~~**The taxonomy decision**, four weeks open.~~ Made at D17; see above.
3. ~~**The licence audit has never run**~~ — ran at D16. It found all 115 designs recording a
   source URL for a repository that has never existed, and the detail modal telling customers
   a first-party design "comes from open source". Both fixed. **Still open from it:** the repo
   has no LICENSE file, so the `MIT` on 115 designs is a claim the project has not made
   anywhere. Either add the LICENSE or change the recorded value.
4. **The editor was not auditable on mobile** at D15 — it needs a signed-in session, so the
   content panel at 375px is still unverified. Worth ten minutes with a real account before
   D20 rather than discovering it at launch.
5. **A small-print size wants a token.** `text-[11px]` x5 and `text-[10px]` x3 across the
   discovery components and the sidebar. Noted at D19 and deliberately not changed under the
   freeze.
6. **Ten shelves hold one design each** — resume, architecture, professional_services,
   nonprofit, media, arts_culture, personal and three more. Not a fault, and folding them
   would misfile designs to flatter a count. But if D18's thumbnails make thin shelves look
   thin, this is the lever.
