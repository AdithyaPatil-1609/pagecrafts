# R2 week 3 — Discovery & the content panel (D11–D15), Pragna's track

Written at D10, against what week 2 actually left rather than what it planned to leave.

**Week 2 exit, as it stands:** the gallery runs on the live query with combinable chips and
URL state; the content panel is generated from `content_schema` and edits patch through to
the preview; every FieldType has a control. 115 designs, all carrying licence and source_url.

## Where D10 leaves things

| | State |
| --- | --- |
| Library | 115 designs, provenance checked over all of them |
| Gallery | live query, chips, URL state, honest "N of M", empty state with reset |
| Content panel | generated from the schema; text, richtext, colour, select editable |
| Lists | items editable; **add / remove / reorder not built** (D11) |
| Images | slots show state and clear; **picker is a placeholder** (D12) |
| Validation | shared with the write path, inline, no wasted round trip |

## Carried into week 3

These are known and unfixed, not discoveries waiting to happen.

1. **The feature chip cannot narrow anything.** `form`, `list` and `photo` each return all
   115 designs, because every blueprint-generated design has a form, a list and a hero
   photo. The filter is correct and the axis is useless. Either drop the chip until the
   library varies, or derive features on something that actually differs.

2. **The templates table has never been seeded.** `npm run templates:seed` exists and has
   never run, so the gallery reads the module while fork reads the table. Until it runs,
   "Use this design" fails on every design. This is the single most important thing in the
   list and it needs database credentials, not code.

3. **`data/templates/sources/` holds one design.** The normaliser is the documented way in
   and 114 designs did not come through it. Worth deciding whether that matters before the
   library grows again.

## The week

### D11 · Repeatable lists, finished
- Add, remove and reorder items in a list field, against `content_schema`'s `itemSchema`.
- A new item starts from the schema rather than from an empty object, so a card is never
  half a card.
- Reordering is a whole-list op, like every other list write — the write path takes the
  array, not a move instruction.

**Watch:** the panel has no per-template code today and that is worth more than any single
feature. Adding items is where a "just for this design" branch usually appears.

### D12 · The asset picker, for real
- Unsplash search behind the existing server-side route, so the access key never reaches the
  browser (S-1 already does this for the pick itself).
- Upload from the picker, reusing `POST /assets` and its 5 MB gate.
- Set an image slot from the picker; clearing already works.
- Attribution rendered where the licence requires it.

**Depends on:** nothing outstanding. `createAssetFromUnsplash` and `createAssetFromUpload`
both exist and are tested.

### D13 · Published images
- **The open question this week must answer:** project assets live in a private bucket, so
  the only URL available is a signed one that expires in an hour. A favicon on a live site
  cannot be a signed URL. Decide how published sites get durable image URLs — a public
  bucket for published assets, a copy at publish time, or a proxy — and implement it.
- `metaTags` already skips an unresolved asset rather than writing a broken link, so nothing
  is broken today; it is simply incomplete.

### D14 · Discovery polish against real use
- Thumbnails: `thumbnailUrlFor` returns null for every design because none has ever been
  rendered. Either render them or remove the field.
- Gallery performance with 115 designs and their hero photographs on a throttled connection.
- The describe screen's ranking, checked against real descriptions rather than fixtures.

### D15 · Milestone
- Someone picks a design, forks it, edits content and images, and publishes — end to end,
  against the real database.
- Re-run the D10 acceptance with the templates table seeded, so the gallery and fork read
  the same library.

## Dependencies

| Need | From | When |
| --- | --- | --- |
| Migrations applied + `templates:seed` run | whoever holds Supabase | D11, first thing |
| Publish route calling `projectPublishInputs` / `assertCanPublish` | Adhyay | D13 |
| A decision on published image URLs | team | D13 |
| Payments before a paid fork | Adhyay / payments | D15 |
