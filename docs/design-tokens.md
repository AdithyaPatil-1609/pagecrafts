# Design tokens

The shared design system for every PageCraft screen. Screens and components are
built **only** from these tokens — no ad-hoc hex values, no per-screen style
forks (FR-001). Tokens are defined in `src/app/globals.css` and surfaced to
Tailwind via `@theme inline`, so each one is usable as a normal utility.

Live reference: run the app and open **`/styleguide`**.

## Theme

PageCraft is **dark-glass**. The default canvas is near-black navy (`#05070A` →
`#0B121E`) with electric blue bloom, a spare amber glow, frosted panels, and a
red brand, defined in `:root`. `.light` matches that default. `.dark` is the
same family so every token still has both values. There is no
`prefers-color-scheme` switch — the navy glass is the product's identity, not a
preference.

The pictorial atmosphere (floating website sketches, blooms, grain) sits
**behind** a frosted wash. Colour used as text still comes from the tokens
below.

## Colour tokens

Semantic, not literal — pick by role, not by hue.

| Token | Utility examples | Role |
| --- | --- | --- |
| `background` / `foreground` | `bg-background`, `text-foreground` | Page surface and body text |
| `card` / `card-foreground` | `bg-card`, `text-card-foreground` | Cards and raised surfaces |
| `popover` / `popover-foreground` | `bg-popover` | Dialogs, menus, popovers |
| `primary` / `primary-foreground` | `bg-primary`, `text-primary-foreground` | Brand red; the one main action per screen |
| `signal` / `signal-foreground` | `bg-signal`, `text-signal-foreground` | Bright orange — pill dots and the header CTA |
| `secondary` / `secondary-foreground` | `bg-secondary` | Secondary buttons, quiet fills |
| `muted` / `muted-foreground` | `text-muted-foreground` | De-emphasised text and fills |
| `accent` / `accent-foreground` | `bg-accent` | Hover states, subtle highlights |
| `destructive` / `destructive-foreground` | `bg-destructive` | Errors and destructive actions |
| `border` / `input` | `border-border`, `border-input` | Hairlines and field borders |
| `field` | `bg-field` | Input surface — sits one step above its card |
| `ring` | `ring-ring` | Focus ring — always visible for keyboard use |
| `brand-ink` | `text-brand-ink` | The brand red as **text**. Use wherever brand red is words rather than a fill |

`primary` and `brand-ink` are the same red doing two jobs, and one value cannot do both.
`#dc2626` behind white text is 4.83:1 and correct. On the navy glass,
`--brand-ink` is `#f87171` so small brand text stays above 4.5:1. Fills, borders
and icons stay on `primary`; an icon only needs 3:1, which `#dc2626` already clears.

`--signal` (`#ff8a1a`) is atmosphere and chrome, not body copy. Pair it with
`--signal-foreground` (`#05070a`) when it is a filled button.

## Brand gradient

`--brand-from` → `--brand-to` is the one red gradient in the product, plus
`--brand-glow` for the light it throws. Components never hand-roll a
`linear-gradient`; they use these utilities:

| Utility | Use |
| --- | --- |
| `brand-gradient` | Filled gradient surface — primary CTAs, the logo tile |
| `brand-text` | Gradient-filled text — red brand emphasis |
| `hero-mix` | Headline accent line: white → sky → sage → tan → gold |
| `hero-gold` | Warm gold fill for a single headline word |
| `brand-halo` | Soft red glow around a panel or icon badge |
| `brand-bloom` | Radial ambient light for page backdrops |
| `bloom-blue` / `bloom-sky` / `bloom-amber` | Colour washes behind the website sketches |
| `glass-panel` | Frosted translucent panel |
| `glass-pill` | Capsule badge (hero label) |
| `card-index` | Oversized ghosted `01`–`N` in the top-right of a card. Cropped by `overflow-hidden`. Sit behind copy (`relative z-[1]` on the content). Use `CardIndex`. |
| `card-hover` | Lift + blue glow on fine pointers |

`--bloom-blue`, `--bloom-sky` and `--bloom-amber` are atmosphere only — never text.
`--mix-from` / `--mix-sky` / `--mix-sage` / `--mix-tan` / `--mix-gold` are the
hero mix stops, used only by `hero-mix`.

## Radius

Base is `--radius: 0.75rem`; the scale derives from it.

| Token | Utility |
| --- | --- |
| `--radius-sm` | `rounded-sm` |
| `--radius-md` | `rounded-md` |
| `--radius-lg` | `rounded-lg` |
| `--radius-xl` | `rounded-xl` |

## Typography

Display headlines use **Outfit** (`--font-display`, `font-display`). Body uses
**Plus Jakarta Sans** (`--font-sans`, `font-sans`). Mono stays Geist Mono
(`font-mono`). Stacks fall back to `ui-sans-serif` / `system-ui`, never Arial
or Calibri. The type scale is Tailwind's default step scale
(`text-sm` → `text-base` → `text-lg` → `text-xl` → `text-3xl` …), used directly.

## Rules

- New colour needs? Add or adjust a token here — never a raw hex in a component.
- New capability on a primitive? Extend the primitive in `src/components/ui/`,
  don't fork a screen.
- Both default (`:root` / `.light`) and `.dark` values must be set for every colour
  token.
