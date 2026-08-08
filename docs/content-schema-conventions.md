# content_schema authoring conventions

**Status:** in force from R2 D4. Enforced by `src/lib/templates/conventions.ts` and
`tests/unit/content-schema-conventions.test.ts` — every template in the library is held to
this document on every test run.

## Why there are rules at all

The content panel is generated from a template's `content_schema` and from nothing else. No
design gets its own editing UI, ever (C-07, FR-001). That is what makes 25 templates
affordable: the panel is written once and the library grows without it.

It only holds while the schemas agree with each other. One design that names a field
`Heading_1`, or ships a list with no item shape, or leaves a free-text field uncapped, forces
a special case into the panel — and the first special case is the end of the promise. So
these are not style preferences. Each one is something the generated panel depends on.

Two roads into the library, one shape out:

| Road | Where the schema comes from |
| --- | --- |
| Blueprint (`src/lib/templates/blueprint.ts`) | generated alongside the markup from one spec |
| Normaliser (`src/lib/templates/normalise.ts`) | read back out of a sourced design's markup |

`tests/unit/normalise.test.ts` re-derives every registry template's schema from its own
markup and requires it to match the authored one. If you change either road, that test is
what tells you the two have drifted apart.

## The slot vocabulary

Editable things are marked in the markup with `data-slot`, and the schema is the same set of
paths in another form:

```html
<h1 data-slot="hero.headline">Stronger every day.</h1>
<p  data-slot="hero.subhead">Train hard, stay focused.</p>
<a  data-slot="hero.cta">Join now</a>
<div data-slot="hero.image"><img … /></div>
```

```
hero.headline   →  { key: "headline", type: "text", maxLength: 60 }
hero.subhead    →  { key: "subhead",  type: "text", maxLength: 140 }
hero.cta        →  { key: "cta",      type: "text", maxLength: 24 }
hero.image      →  { key: "image",    type: "image" }
```

Two shapes of path, and no others:

- `<section>.<field>` — a plain field.
- `<section>.<list>.<index>.<key>` — one field of one item of a repeatable list.

Anything deeper has no field to bind to. A slot with no section (`data-slot="headline"`) and a
slot nested past a list item are both rejected by the normaliser rather than guessed at.

**Slot and schema must be exactly parallel.** A slot with no field is uneditable; a field
with no slot edits nothing. Both fail silently in a browser, so `tests/unit/templates.test.ts`
checks parity in both directions for every template.

## Sections

1. **Keys are lower snake_case** (`hero`, `menu`, `opening_hours`) and name what the visitor
   sees, not where it sits in the file.
2. **Every section has a label.** It titles a group in the panel, so it reads as a noun the
   owner recognises: "Hero", "Classes", "Opening hours".
3. **Every section has at least one field.** A section with none is an empty heading.
4. **Sections appear in the order the visitor meets them** on the page. The panel is read top
   to bottom against the preview beside it.
5. **`site` is last.** It is page-wide chrome — the wordmark, the footer note — not a band of
   the page. The wordmark lives in the header, so document order alone would open the panel
   on it; the normaliser pins it last for that reason.

## Fields

1. **Keys are lower snake_case** and unique within their section (and within an item shape).
2. **Every field has a label**, and the label is an instruction to a non-technical owner, not
   the key humanised. `cta` is labelled "Button label"; `subhead` is "Subheading".
3. **A `text` field always declares `maxLength`.** The design was drawn for a length: a
   headline field with no cap is a layout bug waiting for its first long headline. Caps in
   use across the library:

   | Key | Cap | Key | Cap |
   | --- | --- | --- | --- |
   | `headline`, `heading` | 60 | `cta`, `button` | 24 |
   | `subhead`, `subheading` | 140 | `name` | 40 |
   | `footer` | 120 | item `title` | 40 |
   | item `body`, `caption` | 160 | | |

4. **`richtext` is the long-form field and is never capped.** Use it for a paragraph the owner
   may want to write properly; use `text` for everything that has to fit a line.
5. **`maxLength` is meaningless on `image`, `color`, `select` and `list`** — leave it off.
6. **`select` declares at least two `options`.** One option is not a choice. `options` belong
   on nothing else.
7. **Image slots are `image`**, whether the key says so (`image`, `photo`, `logo`, `cover`,
   `favicon`, `og_image`) or the element does (`<img>`). An image field never carries a URL
   the owner has to paste — it holds an asset the picker sets (D9, D12).

The six field types are frozen (`contracts.md`): `text`, `richtext`, `image`, `color`,
`select`, `list`. **Extend `FieldType` and the panel's control map; never add per-template
code** (C-07). If a design seems to need a seventh type, that is a contract change, not a
local workaround.

## Repeatable lists

A list is a section field whose items share one shape:

```
menu.items       →  { key: "items", type: "list", itemSchema: [ … ] }
menu.items.0.title  →  itemSchema: { key: "title", type: "text", maxLength: 40 }
menu.items.0.body   →  itemSchema: { key: "body",  type: "text", maxLength: 160 }
```

1. **A list declares a non-empty `itemSchema`.** It is the shape of one item, and it is what
   the panel draws when someone adds one.
2. **`itemSchema` belongs on nothing but a list.**
3. **Lists do not nest.** The panel draws one level of items (add / remove / reorder, D11).
4. **Item fields are one-liners.** No `richtext` inside an item: it sits in a card, not a
   column. The same key can be `richtext` at section level and capped `text` inside an item —
   `body` is exactly that, and the normaliser applies the distinction automatically.
5. **Number items from `0`, consecutively**, in the markup. Every item contributes its keys to
   the item shape, so an optional field that only the third card uses is still in the schema.

## Authoring a new template

Blueprint road — add a spec to `src/lib/templates/designs.ts`; the markup, stylesheet and
schema are generated together, so the conventions hold by construction.

Sourced road:

```bash
npm run templates:normalise -- data/templates/sources/<id>
```

The source directory holds the design's own files plus a `template.json` sidecar carrying
what the files cannot say — `id`, `name`, `description`, `tier`, and the provenance
(`license`, `sourceUrl`) that C-06 requires as non-null. The normaliser drafts the schema
from the markup's slots, infers category and tags from the design's own copy where the
sidecar leaves them out (and warns that it guessed), and refuses the source outright if the
licence is missing. `data/templates/sources/cafe` is a worked example.

Then check your work:

```bash
npm test
```

`content-schema-conventions.test.ts` holds every library template and the worked example to
this document. A failure names the field and the rule.
