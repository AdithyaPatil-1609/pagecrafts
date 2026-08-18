# Design tokens

The shared design system for every PageCraft screen. Screens and components are
built **only** from these tokens — no ad-hoc hex values, no per-screen style
forks (FR-001). Tokens are defined in `src/app/globals.css` and surfaced to
Tailwind via `@theme inline`, so each one is usable as a normal utility.

Live reference: run the app and open **`/styleguide`**.

## Theme

PageCraft is **dark-first**. The dark palette is the default, defined in
`:root`; the light palette is opt-in via a `.light` class on `<html>`. There is
no `prefers-color-scheme` switch — the near-black surface with a red brand is
the product's identity, not a preference.

## Colour tokens

Semantic, not literal — pick by role, not by hue.

| Token | Utility examples | Role |
| --- | --- | --- |
| `background` / `foreground` | `bg-background`, `text-foreground` | Page surface and body text |
| `card` / `card-foreground` | `bg-card`, `text-card-foreground` | Cards and raised surfaces |
| `popover` / `popover-foreground` | `bg-popover` | Dialogs, menus, popovers |
| `primary` / `primary-foreground` | `bg-primary`, `text-primary-foreground` | Brand red; the one main action per screen |
| `secondary` / `secondary-foreground` | `bg-secondary` | Secondary buttons, quiet fills |
| `muted` / `muted-foreground` | `text-muted-foreground` | De-emphasised text and fills |
| `accent` / `accent-foreground` | `bg-accent` | Hover states, subtle highlights |
| `destructive` / `destructive-foreground` | `bg-destructive` | Errors and destructive actions |
| `border` / `input` | `border-border`, `border-input` | Hairlines and field borders |
| `field` | `bg-field` | Input surface — sits one step above its card |
| `ring` | `ring-ring` | Focus ring — always visible for keyboard use |
| `brand-ink` | `text-brand-ink` | The brand red as **text**. Use wherever brand red is words rather than a fill |

`primary` and `brand-ink` are the same red doing two jobs, and one value cannot do both.
`#dc2626` behind white text is 4.83:1 and correct; the same red as small text on the
near-black surface is 4.16:1, under the 4.5:1 WCAG AA asks for. Lightening `primary` to fix
the text would have taken the button to 3.76:1. So text gets its own token — red-500 on
dark, red-600 unchanged on light, both above 4.5:1 (R2 D20). Fills, borders and icons stay
on `primary`; an icon only needs 3:1, which `#dc2626` already clears.

## Brand gradient

`--brand-from` → `--brand-to` is the one red gradient in the product, plus
`--brand-glow` for the light it throws. Components never hand-roll a
`linear-gradient`; they use these utilities:

| Utility | Use |
| --- | --- |
| `brand-gradient` | Filled gradient surface — primary CTAs, the logo tile |
| `brand-text` | Gradient-filled text — the hero's emphasised word |
| `brand-halo` | Soft red glow around a panel or icon badge |
| `brand-bloom` | Radial ambient light for page backdrops |

## Radius

Base is `--radius: 0.625rem`; the scale derives from it.

| Token | Utility |
| --- | --- |
| `--radius-sm` | `rounded-sm` |
| `--radius-md` | `rounded-md` |
| `--radius-lg` | `rounded-lg` |
| `--radius-xl` | `rounded-xl` |

## Typography

Fonts come from `next/font` (Geist), exposed as `--font-sans` and `--font-mono`
(`font-sans`, `font-mono`). The type scale is Tailwind's default step scale
(`text-sm` → `text-base` → `text-lg` → `text-xl` → `text-3xl` …), used directly.

## Rules

- New colour needs? Add or adjust a token here — never a raw hex in a component.
- New capability on a primitive? Extend the primitive in `src/components/ui/`,
  don't fork a screen.
- Both dark (`:root`) and light (`.light`) values must be set for every colour
  token.
