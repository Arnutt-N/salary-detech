<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Salary Detech — Agent Guide

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
npm run test:e2e:full  # build + Playwright batch import flow
npm run test:e2e       # Playwright only (requires prior build)
npx prisma db push && npx tsx prisma/seed.ts
npx tsx __tests__/run.ts # full test suite (CI)
```

Default seed login: `admin` / `password` (change in production).

## When changing behavior

1. Read `hr-order-freshness-check-v2.md` for scenario rules (A–J) before altering freshness or cascade logic.
2. Update or add tests in `__tests__/` for engine and API changes.
3. Run `npx tsx __tests__/run.ts` before claiming done.
4. Keep diffs minimal; match naming and import style (`@/` alias) of neighboring files.

## Design Context

Before UI/UX work, read:

- `PRODUCT.md` — register (`product`), users, purpose, brand personality, anti-references, design principles
- `DESIGN.md` — visual tokens, typography, components, do's/don'ts (DESIGN wins on visual; PRODUCT wins on voice/strategy)

Live mode config: `.impeccable/live/config.json` (Next.js App Router → `app/layout.tsx`).

## Core Working Rules & Safety (กฎกติกาการทำงานและความปลอดภัย)

1. **ห้ามเปิดเผยหรือส่ง Secrets & Sensitive Data เด็ดขาด:**
   - ห้ามพิมพ์, แสดง, โพสต์ หรือส่ง API keys, Secret keys, Credentials, Passwords, Token หรือข้อมูลสำคัญ/ข้อมูลส่วนบุคคล (PII/Sensitive data) ลงในแชท หรือส่งออกสู่ภายนอกเด็ดขาด
   - ป้องกันและไม่เปิดเผยค่าจาก `.env` หรือไฟล์ความลับใดๆ

2. **การสื่อสารและการอธิบาย (ภาษาไทยเป็นหลัก สำหรับ Non-Dev & Basic Programming):**
   - ใช้ภาษาไทยเป็นภาษาหลักในการตอบและอธิบาย
   - อธิบายให้เข้าใจง่าย เป็นขั้นเป็นตอน ลงรายละเอียดที่ชัดเจน เหมาะสำหรับผู้ใช้งานระดับ Non-developer หรือผู้มีความรู้โปรแกรมมิ่งเบื้องต้น
   - หลีกเลี่ยงการใช้ศัพท์เทคนิคเฉพาะทางโดยไม่อธิบายที่มาที่ไป

3. **คำแนะนำไวยากรณ์ภาษาอังกฤษ (English Prompting Guidance):**
   - เมื่อผู้ใช้งานสั่งงานหรือเขียน Prompt เป็นภาษาอังกฤษ ให้ช่วยแนะนำไวยากรณ์ (Grammar) และประโยคภาษาอังกฤษที่ถูกต้องและเป็นธรรมชาติควบคู่ไปด้วย เพื่อช่วยพัฒนาทักษะการ Prompt ภาษาอังกฤษ

4. **Git Workflow & Skill Collections:**
   - **ก่อนเริ่มงานใหม่หรือ Phase ใหม่ทุกครั้ง:** ต้องสร้าง Git Branch ใหม่เสมอ (`git checkout -b <branch-name>`)
   - **อ้างอิง Skills จากคอลเลกชันล่าสุด:** เลือกใช้ Skill ที่ตรงกับงานโดยอ้างอิงจากเอกสาร [`.claude/skill-collections-20260815.md`](.claude/skill-collections-20260815.md) เวอร์ชันล่าสุด

5. **การปกป้องไฟล์และโฟลเดอร์ (File Deletion Protection):**
   - **ห้ามลบไฟล์หรือโฟลเดอร์ใดๆ ในโปรเจกต์เด็ดขาด** หากไม่ได้รับอนุญาตอย่างชัดเจนจากผู้ใช้งาน

## Avoid

- Duplicating freshness/stale rules outside `lib/freshness.ts`.
- Adding `middleware.ts` alongside `app/proxy.ts` without an explicit migration.
- Committing `.env` or real secrets.
- Unnecessary new abstractions, verbose comments, or tests that only assert mocks.
- Assuming standard Next.js 14/15 APIs — verify against `node_modules/next/dist/docs/` for this repo’s Next 16 version.
- Deleting files/directories without explicit user approval.
- Exposing or outputting secrets, credentials, or sensitive tokens in chat.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
