# Reduce MainNav Header Height to 48px

Written against: 6dfd8ada784cccf193ff1d41db0a9139718f8ad4

## Evidence chain

- Surface: Global Main Navigation Header (`components/shared/main-nav.tsx`)
- Problem: The main navigation container rendered height is 56px (`h-14`), exceeding the 48px (`h-12`) design standard.
- Design evidence: `DESIGN.md` line 46 (`nav-height: "48px"`), line 89 (`Sticky top nav สูง 48px, active link ชัด`), and line 164 (`MainNav: sticky top, white bg, border-b, h-12, max-w-5xl centered`).
- Owner: `components/shared/main-nav.tsx`
- Scope and affected surfaces: `components/shared/main-nav.tsx` (rendered globally via `app/layout.tsx` across `/dashboard`, `/employees`, `/orders`, `/batches`, `/reports/*`)
- Uncertainty: none

## Design decision

Change the container height utility class in `components/shared/main-nav.tsx` from `h-14` (56px) to `h-12` (48px) to align with the system token `nav-height: 48px` specified in `DESIGN.md`.

## Reuse

- Tailwind utility: `h-12` (48px / 3rem height)
- Exemplar: `DESIGN.md` line 164 (`MainNav: sticky top, white bg, border-b, h-12, max-w-5xl centered`)

## Changes

1. `components/shared/main-nav.tsx`
   - Change: In line 42, replace `<div className="flex h-14 items-center gap-2 sm:gap-3">` with `<div className="flex h-12 items-center gap-2 sm:gap-3">`.
   - Preserve: Existing flex alignment, responsive breakpoint behavior (`lg:flex`, `lg:hidden`), mobile drawer toggling, and user nav placement.
   - Verify: The sticky top navigation renders at 48px height on desktop viewports.

## Scope

- Inherit: All pages importing `MainNav` via `app/layout.tsx`.
- Verify: Navigation links and Brand text vertical alignment remain centered within 48px.
- Exclude: `/login` route (MainNav is hidden on login).

## Validation

- Product: HR officers have full access to navigation with optimal vertical screen real estate.
- Interface: Verify `/orders`, `/dashboard`, `/batches` on desktop (≥1024px) and mobile (<1024px).
- System: Inspect layout header height matching 48px (`h-12`).
- Repository: `npm run build` → build succeeds without layout errors.

## Stop conditions

- Stop if changing `h-14` to `h-12` causes overflow or visual clipping with the touch target height (`min-h-11`) on inner navigation links.

## Design documentation

- After acceptance and validation: None required (already documented in `DESIGN.md` §1 and §5).
