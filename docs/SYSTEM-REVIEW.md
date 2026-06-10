# System Review — Salary Detech

> ผลการวิเคราะห์ทั้งระบบ (โลจิก / UI-UX / CRUD) และรายการปรับปรุงที่ทำไปแล้ว
> อัปเดตล่าสุด: มิ.ย. 2026 (รอบ rebrand "Salary Audit" → "Salary Detech")

## 1. Rebrand

| จุด | สถานะ |
|------|--------|
| `app/layout.tsx` (title + nav brand) | ✅ Salary Detech |
| `app/login/page.tsx` (heading) | ✅ Salary Detech |
| `README.md`, `PRP.md`, `AGENTS.md` | ✅ |
| `docs/RUNBOOK.md`, `docs/DEPLOY.md`, `docs/SMOKE-TEST.md` | ✅ |

## 2. Shared utilities (single source of truth)

ปัญหาเดิม: label maps และ stale where-clause ถูกเขียนซ้ำกระจาย 8+ ไฟล์ ทำให้แก้ที่หนึ่งแล้วอีกที่ไม่ตรงกัน

| Utility | ไฟล์ | ใช้แทน |
|---------|------|---------|
| `ORDER_TYPE_OPTIONS`, `getOrderTypeLabel` | `lib/order-types.ts` | local `typeLabel` maps ใน dashboard, orders, stale report, employee detail, batches |
| `ORDER_STATUS_OPTIONS`, `getOrderStatusLabel` | `lib/order-types.ts` | local `statusLabel` maps ใน orders list/detail |
| `STALE_FLAG_FIELDS` | `lib/freshness.ts` | รายชื่อ 5 freshness flags (เดิมบางจุดนับแค่ 3) |
| `STALE_ORDER_WHERE` | `lib/freshness.ts` | OR-block ซ้ำใน 7 จุด (pages + API routes) |

จุดที่ migrate มาใช้ shared แล้ว:

- Pages: `dashboard`, `orders`, `orders/[id]`, `reports/stale`, `employees`, `employees/[id]`, `batches`, `batches/[id]`
- API: `api/employees`, `api/employees/[id]`, `api/reports/stale/export`, `api/dashboard/summary`, `api/dashboard/stale`

## 3. Logic consistency

- **Freshness flags**: batch detail เดิมนับแค่ 3 flags (`salary`, `level`, `org`) → แก้เป็นครบ 5 flags (`+ position`, `type`) ทั้งใน Prisma select, `OrderWithPersonMinimal` type และการแสดงผล
- **นิยาม "stale"**: ทุก query ใช้ `STALE_ORDER_WHERE` เดียวกัน (`orderStatus in [active, superseded]` + flag ใดเป็น `stale`) — ไม่มีนิยามแยกเฉพาะหน้าอีก
- **Freshness engine**: การสร้าง/activate order ยังผ่าน `validateOrderFreshness` + `cascadeStaleCheck` ใน `app/api/orders/route.ts` ตามเดิม (ไม่ duplicate logic ใน UI)

## 4. UI/UX consistency

| เรื่อง | เดิม | ตอนนี้ |
|--------|------|--------|
| Navigation | `<nav>` hardcode ใน layout, โชว์บนหน้า login ด้วย | `components/shared/main-nav.tsx` (client) — active state ตาม pathname, ซ่อนบน `/login`, เพิ่มเมนู 🚨 ต้องแก้ไข (`/reports/stale`) |
| Heading | dashboard ใช้ `text-3xl` หน้าอื่น `text-2xl` | ทุกหน้า `text-2xl font-bold` |
| ปุ่มสร้างคำสั่ง | ไม่มีจากหน้า orders list | ➕ สร้างคำสั่งใหม่ ที่หัวหน้า orders + ลิงก์ใน empty state |
| Breadcrumb | batch detail ไม่มีทางกลับ | `ชุดคำสั่ง / {batchNo}` |
| ลิงก์เชื่อมโยง | dashboard/stale report เป็น text ล้วน | แถว order ลิงก์ไป `/orders/[id]`, KPI "ต้องแก้ไข" + header ลิงก์ไป `/reports/stale`, batch order id ลิงก์ไป order detail |
| วันที่ | ปน 3 แบบ (ISO ดิบ / locale / toThaiDate) | วันที่ธุรกิจทุกจุดใช้ `toThaiDate` (พ.ศ.), timestamps ระบบใช้ `toLocaleDateString("th-TH")` |
| Feedback | `BatchActions` ใช้ `alert()` | Sonner toast (success/error) เหมือนฟอร์มอื่น |
| Status badge | label กระจาย/ไม่ตรงกัน | `getOrderStatusLabel` / `getOrderTypeLabel` ที่เดียว |

## 5. CRUD coverage

| Entity | Create | Read | Update | Delete/Terminal |
|--------|--------|------|--------|-----------------|
| Person (employee) | ✅ `/employees/new` | ✅ list + detail | ✅ `/employees/[id]/edit` | — (soft ผ่าน status) |
| Order | ✅ `/orders/new` (+ ปุ่มจาก list) | ✅ list + detail | ✅ `/orders/[id]/edit` (draft) | ✅ cancel/void/supersede ผ่าน actions |
| OrderBatch | ✅ `/batches/new` + import | ✅ list + detail | ✅ preview → approve/reject | ✅ reject |

## 6. ข้อเสนอที่ยังไม่ได้ทำ (backlog)

1. **Pagination ฝั่ง server** — orders/employees list ยัง fetch ทั้งหมดแล้วให้ DataTable จัดการฝั่ง client; ถ้าข้อมูลโตควรย้ายเป็น cursor pagination
2. **Batch status label ภาษาไทย** — `batch.status` (`draft`/`previewed`/`approved`/`rejected`) ยังแสดงค่าอังกฤษดิบในหน้า batch detail (กันไว้เพราะ E2E ปัจจุบัน assert ข้อความเหล่านี้ — ถ้าจะแปลต้องอัปเดต Playwright spec พร้อมกัน)
3. **Loading states** — ยังไม่มี `loading.tsx` ต่อ route; หน้า list ใหญ่ควรเพิ่ม skeleton
4. **Search debounce** — ช่องค้นหา employees/orders ยัง submit ผ่าน form GET; ถ้าต้องการ live search ค่อยเพิ่ม client debounce
5. **Performance** — ติดตามผลหลังเพิ่ม index/connection reuse (ดู `lib/prisma.ts`); พิจารณา `unstable_cache` กับ dashboard KPIs
