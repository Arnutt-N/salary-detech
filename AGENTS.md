<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Salary Audit — Agent Guide

ระบบตรวจสอบความถูกต้องของข้อมูลในคำสั่งข้าราชการ (HR Order Freshness Check). เป้าหมาย: ข้อมูลในคำสั่งตรงกับข้อเท็จจริง ณ `effective_date` ของคำสั่งนั้น

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind v4, shadcn/ui, Noto Sans Thai, Sonner toasts |
| Data | Prisma 7 + `@prisma/adapter-libsql` (SQLite dev / Turso prod) |
| Auth | Auth.js (NextAuth v5) credentials via env |
| Validation | Zod + React Hook Form |
| Tests | `node:test` via `tsx` (`__tests__/run.ts`) |
| Deploy | Vercel + Sentry |

## Layout

```
app/           # Pages + API routes (App Router)
  proxy.ts     # Auth gate (Next 16 proxy — not middleware.ts)
  dashboard/, employees/, orders/, batches/, reports/, login/
  api/         # REST handlers
lib/
  freshness.ts # Core domain: stale checks, preview, cascade
  prisma.ts    # Singleton client; prefers TURSO_DATABASE_URL
  auth.ts, date-utils.ts, types.ts, validation/
prisma/        # schema.prisma (10 models), seed.ts
__tests__/     # freshness + API tests; fixtures in __tests__/fixtures/
docs/          # PRDs, plans, RUNBOOK.md
```

Domain spec: `hr-order-freshness-check-v2.md`. Roadmap: `PRP.md`.

## Domain essentials

- **Person** (`persons`): ข้าราชการ; current fields are denormalized snapshots.
- **Order** (`orders`): คำสั่ง + snapshot fields + five freshness flags (`statusSalary`, `statusPosition`, `statusType`, `statusLevel`, `statusOrg`: `latest` | `stale` | `corrected`).
- **Order lifecycle**: `draft` → preview → `active` → `cancelled` / `superseded` / `void`.
- **OrderBatch**: ชุดคำสั่ง; workflow draft → preview → approved.
- **EmployeeChangeLog**: source of truth for current level/position/org after active orders.
- **Freshness engine** (`lib/freshness.ts`): `isOrderStale`, `validateOrderFreshness`, `previewImpact`, `cascadeStaleCheck`, `hasDependency`. Always use these when creating/activating orders — do not duplicate stale logic in routes or UI.

Common `orderType` values: `salary_increase`, `special_salary`, `promotion`, `transfer`, `resign`, `salary_cap_adjustment`, `salary_apr`, `salary_oct`, `salary_entitlement`, `salary_qualification`, `appointment`.

Order salary snapshot fields (Thai labels in `hr-order-freshness-check-v2.md` §2.1): `salary`, `costOfLivingAllowance` (เงินเพิ่มการครองชีพชั่วคราว), `specialCompensation`, `positionAllowance`, `compensationBeyondSalary` (ค่าตอบแทนนอกเหนือจากเงินเดือน), `salaryAsOfDate`.

## Conventions

### Next.js

- Prefer Server Components for read-heavy pages; client components only for forms/tables that need interactivity.
- `app/layout.tsx` sets `dynamic = 'force-dynamic'` and global nav.
- Request auth: `app/proxy.ts` wraps `auth()` — public paths: `/login`, `/api/auth/*`. Do not add `middleware.ts` unless migrating intentionally.

### Dates

- Store business dates as ISO strings (`YYYY-MM-DD`) in the DB.
- Display with `lib/date-utils.ts` (`toThaiDate`, พ.ศ. +543). Do not hand-roll Thai formatting in components.

### Prisma

- Import `prisma` from `@/lib/prisma` only.
- Schema changes: `npx prisma db push` (CI uses SQLite `file:./dev.db`). Runtime URL: `TURSO_DATABASE_URL` ?? `DATABASE_URL` ?? `file:./dev.db`.
- Model `Person` is exposed as “employee” in API/UI (`employeeId` on `Order`).

### API routes

- Pattern: `app/api/<resource>/route.ts` and `[id]/route.ts`.
- Return `NextResponse.json`; use try/catch with sensible status codes on mutations.
- After creating/activating an **active** order: call `validateOrderFreshness` and `cascadeStaleCheck` (see `app/api/orders/route.ts`).
- Batch preview/approve: `app/api/batches/[id]/preview`, `approve`.

### Forms

- Schemas in `lib/validation/` (`orderSchema`, batch schemas). Error messages in Thai.

### Auth

- `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `AUTH_SECRET` from env — never hardcode credentials.
- `lib/auth.ts` denies all logins if `ADMIN_PASSWORD` is unset.

### UI

- Match existing patterns: `components/shared/data-table.tsx`, page-local `*Table.tsx` / `*Form.tsx`.
- Keep copy and labels in Thai where the surrounding page does.
- Minimal layout: `max-w-5xl`, zinc palette, sticky top nav (see `app/layout.tsx`).

## Commands

```bash
npm run dev              # local dev (SQLite dev.db by default)
npm run build && npm run lint
npx prisma db push && npx tsx prisma/seed.ts
npx tsx __tests__/run.ts # full test suite (CI)
```

Default seed login: `admin` / `password` (change in production).

## When changing behavior

1. Read `hr-order-freshness-check-v2.md` for scenario rules (A–J) before altering freshness or cascade logic.
2. Update or add tests in `__tests__/` for engine and API changes.
3. Run `npx tsx __tests__/run.ts` before claiming done.
4. Keep diffs minimal; match naming and import style (`@/` alias) of neighboring files.

## Avoid

- Duplicating freshness/stale rules outside `lib/freshness.ts`.
- Adding `middleware.ts` alongside `app/proxy.ts` without an explicit migration.
- Committing `.env` or real secrets.
- Unnecessary new abstractions, verbose comments, or tests that only assert mocks.
- Assuming standard Next.js 14/15 APIs — verify against `node_modules/next/dist/docs/` for this repo’s Next 16 version.
