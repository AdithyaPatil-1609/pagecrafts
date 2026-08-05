# Design tokens

The shared design system for every PageCraft screen. Screens and components are
built **only** from these tokens — no ad-hoc hex values, no per-screen style
forks (FR-001). Tokens are defined in `src/app/globals.css` and surfaced to
Tailwind via `@theme inline`, so each one is usable as a normal utility.

Live reference: run the app and open **`/styleguide`**.

## Colour tokens

Semantic, not literal — pick by role, not by hue. Light values are in `:root`;
dark values switch on `prefers-color-scheme: dark`.

| Token | Utility examples | Role |
| --- | --- | --- |
| `background` / `foreground` | `bg-background`, `text-foreground` | Page surface and body text |
| `card` / `card-foreground` | `bg-card`, `text-card-foreground` | Cards and raised surfaces |
| `popover` / `popover-foreground` | `bg-popover` | Dialogs, menus, popovers |
| `primary` / `primary-foreground` | `bg-primary`, `text-primary-foreground` | Brand indigo; the one main action per screen |
| `secondary` / `secondary-foreground` | `bg-secondary` | Secondary buttons, quiet fills |
| `muted` / `muted-foreground` | `text-muted-foreground` | De-emphasised text and fills |
| `accent` / `accent-foreground` | `bg-accent` | Hover states, subtle highlights |
| `destructive` / `destructive-foreground` | `bg-destructive` | Errors and destructive actions |
| `border` / `input` | `border-border`, `border-input` | Hairlines and field borders |
| `ring` | `ring-ring` | Focus ring — always visible for keyboard use |

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
- Both light and dark values must be set for every colour token.
