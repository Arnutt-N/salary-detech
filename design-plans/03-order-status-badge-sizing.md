# Normalize Order Lifecycle Status Badge Sizing in Order Details

Written against: 6dfd8ada784cccf193ff1d41db0a9139718f8ad4

## Evidence chain

- Surface: Order Detail Page (`app/orders/[id]/page.tsx`)
- Problem: The order status indicator badge in the header card includes `min-h-11` (44px min touch height), causing a non-interactive text pill to render with excessive thickness and visual distortion.
- Design evidence: `DESIGN.md` §5 (`Buttons` use `min-h-11`, whereas status badges and chips use compact pill padding `px-2.5 py-1 text-xs` / `px-2 py-1 text-xs`). Exemplars: `app/orders/OrdersTable.tsx` line 65-67 (`<span className="text-xs px-2 py-1 rounded-full bg-zinc-100">`) and `components/shared/freshness-badge.tsx` line 22-29.
- Owner: `app/orders/[id]/page.tsx`
- Scope and affected surfaces: `app/orders/[id]/page.tsx`
- Uncertainty: none

## Design decision

Remove the interactive button utility `min-h-11` from the non-interactive status chip in `app/orders/[id]/page.tsx` line 71, and style it as a balanced pill `inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800`.

## Reuse

- Badge styling: `rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800`
- Exemplar: `app/orders/OrdersTable.tsx` line 66 and `components/shared/freshness-badge.tsx` line 23.

## Changes

1. `app/orders/[id]/page.tsx`
   - Change: In line 71, replace:
     ```tsx
     <span className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-zinc-100 px-3 text-xs">
       {getOrderStatusLabel(order.orderStatus)}
     </span>
     ```
     with:
     ```tsx
     <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800">
       {getOrderStatusLabel(order.orderStatus)}
     </span>
     ```
   - Preserve: Thai lifecycle status label resolution (`getOrderStatusLabel`) and placement in the header card right flex column.
   - Verify: The badge renders cleanly as a compact, legible pill with appropriate line height and padding.

## Scope

- Inherit: Order Detail header card (`/orders/[id]`).
- Verify: Visual balance next to page heading (`h1 text-2xl font-bold`).
- Exclude: Action buttons below the card (`.btn-primary`, `.btn-secondary`), which retain `min-h-11` touch targets.

## Validation

- Product: Status is clearly visible and distinguishable without appearing as an oversized unclickable button.
- Interface: Visit `/orders/1` or any order with status `draft`, `active`, `superseded`, etc.
- System: Inspect DOM to ensure no unwanted `min-h-11` or disproportionate padding.
- Repository: `npm run build` → build succeeds without errors.

## Stop conditions

- Stop if status chip requires clickability or dropdown interaction (currently purely informative).

## Design documentation

- After acceptance and validation: None required (already documented in `DESIGN.md` §5).
