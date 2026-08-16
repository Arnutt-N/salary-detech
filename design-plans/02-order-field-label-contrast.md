# Align Order Detail Field Labels and Breadcrumb to ink-muted (zinc-500)

Written against: 6dfd8ada784cccf193ff1d41db0a9139718f8ad4

## Evidence chain

- Surface: Order Detail Page (`app/orders/[id]/page.tsx`)
- Problem: Field metadata labels and breadcrumb path text use `text-zinc-400` (`ink-subtle`), causing low contrast (<4.5:1) and violating the token hierarchy for labels.
- Design evidence: `DESIGN.md` line 8 (`ink-muted: "#71717a"` / `zinc-500`), line 104 (`Ink Muted (#71717a / zinc-500): secondary labels, table meta`), and line 127 (`Label (500, 0.75rem / text-xs, zinc-500): form field labels`). In contrast, `zinc-400` is explicitly reserved for empty states and placeholders (`DESIGN.md` line 105).
- Owner: `app/orders/[id]/page.tsx`
- Scope and affected surfaces: `app/orders/[id]/page.tsx`
- Uncertainty: none

## Design decision

Update the text color class on the `field` helper and breadcrumb container from `text-zinc-400` to `text-zinc-500` (`ink-muted`) to ensure adequate visual contrast and strict adherence to the design token specification.

## Reuse

- Color token: `text-zinc-500` (`ink-muted`)
- Exemplar: `app/orders/[id]/page.tsx` line 68 (`<p className="mt-1 text-sm text-zinc-500">`) and `DESIGN.md` §2 & §3.

## Changes

1. `app/orders/[id]/page.tsx`
   - Change:
     1. In line 44 within the `field` helper function, change `<p className="text-xs text-zinc-400">{label}</p>` to `<p className="text-xs text-zinc-500">{label}</p>`.
     2. In line 54 within the breadcrumb section, change `<div className="text-sm text-zinc-400">` to `<div className="text-sm text-zinc-500">`.
   - Preserve: Field value typography (`text-sm font-medium mt-0.5`), null fallback behavior (`"—"`), and breadcrumb link hover states.
   - Verify: Field labels and breadcrumbs render with crisp `zinc-500` color, maintaining ≥4.5:1 text contrast on white surface.

## Scope

- Inherit: All 12 order metadata fields rendered via `field()` on `/orders/[id]`.
- Verify: Contrast ratio and legibility of Thai labels (e.g. `เงินเดือน`, `วันที่มีผล`, `ตำแหน่ง`).
- Exclude: Form edit input placeholder styling (which legitimately uses `zinc-400`).

## Validation

- Product: HR officers can comfortably read all order metadata labels without visual fatigue.
- Interface: Visit `/orders/1` or any valid order ID; check breadcrumbs and field grid.
- System: Inspect computed color values in DOM matching `#71717a` (`zinc-500`).
- Repository: `npm run build` → build succeeds without errors.

## Stop conditions

- Stop if changing to `text-zinc-500` conflicts with surrounding field value colors (`text-zinc-900` / default).

## Design documentation

- After acceptance and validation: None required (already documented in `DESIGN.md` §2 & §3).
