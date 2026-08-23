# P7 — DPIS Scheduled Pull & Integration Guide — Implementation Plan

## Goal
1. สร้าง**ตัวดึงข้อมูล DPIS แบบตั้งเวลา** (ทางเลือกที่ 2 — Pull ผ่าน SQL Views) ที่ใช้ pipeline เดียวกับ push API ที่มีอยู่
2. เขียน**คู่มือการเชื่อมต่อสำหรับฝั่ง DPIS** (ทางเลือกที่ 1 — Push API) เป็นเอกสารส่งมอบให้ทีม DPIS ใช้ลงมือเชื่อมต่อได้จริง

## หลักคิดสำคัญของแผน (สำคัญ — อ่านก่อนตัดสินใจทำ Task ใดๆ)

**โครงสร้างที่มีอยู่แล้ว (ไม่ต้องสร้างใหม่):**
- SQL Views 3 ตัวบนฐานข้อมูล DPIS: `scripts/dpis-integration-pipeline.sql` (`vw_dpis_salary_detech_person`, `vw_dpis_salary_detech_order`, `vw_dpis_salary_detech_salary_history`)
- Push API 3 endpoints พร้อม auth + zod + caps (PR #16)
- Mapping engine `lib/dpis-mapping.ts`, zod contracts `lib/validation/integration-schema.ts`

**ข้อจำกัดเครือข่ายที่กำหนดสถาปัตยกรรม:**
ฐานข้อมูล DPIS โดยทั่วไปอยู่ในเครือข่ายราชการ (intranet) — Vercel (ที่ระบบเรา deploy อยู่) **ไม่สามารถเปิดการเชื่อมต่อเข้าไปดึงตรงๆ ได้** ตัวดึงข้อมูลจึงต้องเลือกวางตำแหน่ง 1 ใน 2 แบบ:

| รูปแบบ | วางตัวดึงข้อมูลไว้ที่ | การเดินข้อมูล | เหมาะเมื่อ |
|--------|---------------------|---------------|-----------|
| **A. On-prem Agent (แนะนำ MVP)** | เครื่อง/VM ในเครือข่ายราชการที่เข้าถึง DB DPIS ได้ | ดึงจาก Views → ยิงออก (outbound HTTPS) ไปที่ push API ของเรา | มีเครื่องในเครือข่ายราชการให้ใช้ (เกือบทุกหน่วยงานมี) |
| **B. Direct Pull จาก Vercel** | Vercel Cron เรียก API route ของเรา → route เชื่อมตรงไป DB DPIS | Vercel → (DB replica / endpoint ที่เปิดสาธารณะพร้อม TLS + allowlist) | DPIS มี read replica หรือเปิด endpoint ให้ภายนอกเข้าถึงได้ |

**ทั้งสองแบบใช้ "แกนกลาง" โค้ดชุดเดียวกัน** — ต่างกันแค่ตัวรัน (runner): แบบ A รันด้วยสคริปต์ + ตัวจัดตารางเวลาของ OS, แบบ B รันด้วย Vercel Cron

**หลักการสำคัญ:** ตัวดึงข้อมูล**ห้าม**เขียน upsert/freshness logic ใหม่ — ต้อง reuse pipeline เดิม (zod → mapping → upsert → `validateOrderFreshness` → `cascadeStaleCheck`) ตามกติกา repo เรื่องการรวมศูนย์ domain logic

## Constraints
- Follow existing patterns: Prisma direct, `@/` alias, Thai error/label เฉพาะ UI, API messages เป็นอังกฤษ
- Push API contract ห้ามพัง (PR #16 เพิ่ง harden) — การ refactor ต้องคลุมด้วย tests เดิม 66 ตัว
- ทุก task จบด้วย `npx tsx __tests__/run.ts` + `npm run lint` ผ่านก่อนเริ่ม task ถัดไป
- Phase/branch ใหม่ทุกครั้งตามกติกา AGENTS.md
- Next.js 16 — ตรวจ `node_modules/next/dist/docs/` ก่อนใช้ API ของ Next

---

## Phase 0 — ข้อมูลที่ต้องได้จากฝั่ง DPIS ก่อนเริ่ม (บล็อกงาน Phase 2+)

| # | คำถาม | ผลกระทบต่อแผน |
|---|-------|---------------|
| Q1 | ฐานข้อมูล DPIS เป็น engine อะไร (MySQL/Oracle/SQL Server/PostgreSQL)? | เลือก driver (`mysql2` / `oracledb` / `mssql` / `pg`) — สคริปต์ Views ปัจจุบันเขียนสไตล์ MySQL |
| Q2 | มีเครื่อง/VM ในเครือข่ายราชการให้รัน agent หรือไม่? (รูปแบบ A) | ถ้าไม่มี → ต้องเจรจาเรื่อง replica/endpoint (รูปแบบ B) |
| Q3 | Views ที่เราส่ง SQL ให้ไปสร้างบนฐานข้อมูลจริงได้เลยหรือต้องปรับ? | ปรับ `scripts/dpis-integration-pipeline.sql` ให้ตรง dialect |
| Q4 | มีคอลัมน์บอก "แถวนี้ถูกแก้ไขเมื่อ" (updated_at/last_update) หรือไม่? | มี → watermark แบบ incremental แม่นยำ / ไม่มี → ใช้ high-water mark จาก `cmd_date`+id |
| Q5 | ได้ DB account แบบ read-only หรือไม่? | ต้องเป็น read-only เท่านั้น |

**หมายเหตุ:** Phase 1 (refactor) และ Phase 5 (คู่มือ) เริ่มทำได้เลยไม่ต้องรอคำตอบ

---

## Phase 1 — ถอด shared ingest service จาก push routes (ไม่เปลี่ยน behavior)

**เหตุผล:** ตัวดึงข้อมูลและ push API ต้องใช้ pipeline เดียวกัน + แก้จุดอ่อน duplicate ของ orders/sync ไปพร้อมกัน (สำคัญมากสำหรับ pull ที่รันซ้ำทุกวัน)

### Task 1.1: สร้าง `lib/dpis-ingest.ts`
**File:** `lib/dpis-ingest.ts` (NEW) — ย้าย loop logic จาก `app/api/v1/integrations/*/route.ts` มาเป็น service:
- `ingestPersons(records: unknown[]): SyncResult` — zod → mapping → upsert by citizenId (เดิมจาก employees/sync)
- `ingestOrders(records: unknown[]): SyncResult` — zod → resolve person → create → `validateOrderFreshness` + `cascadeStaleCheck` (เดิมจาก orders/sync)
- **เพิ่ม:** dedupe คำสั่ง — ก่อน create เช็ค `findFirst({ where: { orderNo, employeeId } })` → ถ้าซ้ำและ `movementCode`/`cmd_date` ไม่เปลี่ยน ให้ข้ามและนับใน `results.skipped` (idempotent สำหรับการรันซ้ำ)

### Task 1.2: Routes เรียก service
**File:** แก้ 2 routes (`employees/sync`, `orders/sync`) ให้เหลือแค่ auth + แปลง body + เรียก service — response shape เดิมทุกประการ

**Verify:** `npx tsx __tests__/run.ts` ผ่าน 66/66 + เพิ่ม test ใหม่:
- push orderNo ซ้ำ 2 ครั้ง → `created: 1, skipped: 1` และฐานข้อมูลมี 1 แถว
**Note:** `freshness-check` route ไม่ต้องย้าย (ไม่มี ingest)

---

## Phase 2 — Puller core: อ่าน Views + watermark (รอผล Q1, Q4)

### Task 2.1: Prisma model `SyncRun` (บันทึกการซิงค์แต่ละรอบ)
**File:** `prisma/schema.prisma` (เพิ่ม model) + `npx prisma db push`
```
SyncRun { id, mode ("agent"|"cron"), status ("running"|"success"|"failed"),
          startedAt, finishedAt, stats Json,   // {personsCreated, personsUpdated, ordersCreated, ordersSkipped, errors[]}
          watermark Json }                     // { personLastId, orderLastDate, salaryHisLastDate }
```

### Task 2.2: `lib/dpis-pull/source.ts` — ตัวอ่านฐานข้อมูล DPIS
**File:** `lib/dpis-pull/source.ts` (NEW)
- `readView(view, { after, limit })` — query ผ่าน driver ตาม Q1 (MVP: `mysql2` ตาม dialect ของ SQL template ปัจจุบัน; Oracle/SQL Server = adapter ที่เพิ่มทีหลังตามคำตอบจริง)
- env: `DPIS_DB_URL` (+ `DPIS_DB_TYPE`), ไม่ตั้ง → throw พร้อมข้อความชัดเจน (fail-closed ตามสไตล์ `lib/integration-auth.ts`)
- **ห้าม** SELECT * — ระบุคอลัมน์ตาม Views เท่านั้น, อ่านอย่างเดียว

### Task 2.3: `lib/dpis-pull/sync.ts` — orchestrate 1 รอบซิงค์
**File:** `lib/dpis-pull/sync.ts` (NEW)
- ลำดับ: **persons ก่อน → orders ตาม** (คำสั่งอ้างคน ต้องมีคนก่อน — สอดคล้อง error "Please sync employee first")
- chunk ทีละ 500 records (ต่ำกว่า cap 1000 ของ API) ต่อ query
- watermark: อ่านค่าล่าสุดจาก `SyncRun` ล่าสุดที่ success → ส่ง `after` ให้ `readView` → เก็บค่าใหม่ตอนจบ
- เขียน `SyncRun` (status running → success/failed + stats)
- option `fullSync: true` ข้าม watermark (รอบแรก / แก้ข้อมูลย้อนหลัง)
- **view ที่ 3 (salary_history):** Phase 2 นี้ยัง**ไม่นำเข้า** — เก็บไว้ Phase 4 (ดูคำอธิบายที่นั่น)

**Verify:** tests ด้วย fake source (fixture rows จาก view) → ผ่าน `ingestPersons/ingestOrders` → ตรวจข้อมูลใน DB + SyncRun + รันซ้ำ 2 รอบได้ผลลัพธ์ idempotent (created รอบแรก, skipped รอบสอง)

---

## Phase 3 — Runner (2 แบบ, ใช้ sync core ร่วมกัน)

### Task 3.1: สคริปต์สำหรับรูปแบบ A (On-prem Agent) — แนะนำทำก่อน
**File:** `scripts/dpis-pull-agent.ts` (NEW)
- โหมด: `--dry-run` (อ่าน + validate + พิมพ์ summary แต่ไม่เขียน), `--full-sync`, `--limit N`
- ข้อมูลออก 2 ทางเลือก (ตั้งตอนรัน):
  - **ทาง 1 (แนะนำ):** push ไปที่ push API ของเรา (`SALARY_DETECH_URL` + `INTEGRATION_SECRET`) — ผ่าน auth/zod/freshness เต็มระบบ, ไม่ต้องเปิดฐานข้อมูลเราให้เครือข่ายราชการ
  - **ทาง 2:** เขียนตรงเข้า DB เรา (`TURSO_DATABASE_URL`) — สำหรับกรณี API ไม่จำเป็น
- ตัวจัดตาราง: ใช้ Task Scheduler (Windows) / cron (Linux) ของเครื่อง agent — ยกตัวอย่างคำสั่งในคู่มือ
- **ห้าม hardcode secrets** — อ่านจาก env ของเครื่อง agent เท่านั้น

### Task 3.2 (Optional, รอผล Q2): Vercel Cron route สำหรับรูปแบบ B
**File:** `app/api/cron/dpis-pull/route.ts` (NEW) + `vercel.json` เพิ่ม cron entry
- GET + ตรวจ `CRON_SECRET` แบบ **fail-closed** (ปรับ pattern จาก cleanup-previews ที่ยัง fail-open — บันทึกเป็น known issue ที่ควรแก้ตาม)
- เรียก `lib/dpis-pull/sync.ts` ตรงๆ พร้อม guard เวลา (ถ้ายังเหลือ chunk ให้ run ถัดไปเร็วกว่า schedule)
- **ตรวจก่อน:** proxy (`app/proxy.ts`) ไม่ได้ยกเว้น `/api/cron/*` → Vercel Cron จริงอาจโดน redirect ไป /login — ต้องเพิ่ม exception หรือยืนยันพฤติกรรมจริงของ Next 16 proxy ต่อ cron headers

**Verify:** รัน agent แบบ `--dry-run --limit 10` กับฐานข้อมูลจำลอง (docker MySQL + import sample DPIS tables) — พิมพ์ summary ถูกต้อง

---

## Phase 4 — นำเข้าประวัติเงินเดือนย้อนหลัง (view ที่ 3)

**ทำเป็น phase ท้ายเพราะกระทบ domain:** `getMaxSalaryEffectiveDate` อ่านจาก `Order` (orderType กลุ่มเงินเดือน, status active) — ประวัติเงินเดือนจาก DPIS ต้องแปลงเป็นคำสั่งประเภทเงินเดือนเพื่อให้ check "salary_as_of_date" มีฐานเทียบย้อนหลัง (ตอนนี้คนที่ sync ใหม่ไม่มีประวัติ → คำสั่งเก่าไม่ถูก flag)

### Task 4.1: mapping `vw_dpis_salary_detech_salary_history` → Order
- แปลงแต่ละแถวเป็น order `orderType: "salary_increase"` (หรือตาม mov_code ถ้ามี), `orderStatus: "active"`, `salaryAsOfDate = effectiveDate`, dedupe ด้วยกลไก Task 1.1
- **อ่านสถานการณ์ A–J ใน `hr-order-freshness-check-v2.md` ก่อน** (โดยเฉพาะ B, C4, H) — กติกาบังคับของ repo ก่อนแตะข้อมูลที่เข้า freshness engine
- Run ครั้งแรกใช้ `fullSync` ครั้งเดียว (backfill) แล้วค่อยใช้ watermark

**Verify:** test — คนที่ import ประวัติแล้ว + คำสั่งใหม่ที่ `salary_as_of_date` เก่ากว่าประวัติ → `statusSalary: "stale"` ตามสถานการณ์ B

---

## Phase 5 — คู่มือการเชื่อมต่อสำหรับฝั่ง DPIS (ทำได้ทันที ไม่ต้องรอ Phase อื่น)

### Task 5.1: `docs/DPIS-INTEGRATION-GUIDE.md` (NEW — ภาษาไทยทั้งฉบับ สำหรับส่งมอบทีม DPIS)
โครงเรื่อง:
1. **ภาพรวม 2 ทางเลือก** — Push API (เร็วสุด เหมาะทำก่อน) / SQL Views + Agent (สำหรับรันอัตโนมัติ)
2. **Push API:**
   - Base URL + การขอ/ตั้งค่า `Authorization: Bearer <INTEGRATION_SECRET>`
   - ตารางฟิลด์ทั้ง 3 endpoints (ดึงจาก zod schemas + Data Mapping Matrix §3 ของ `DATA-PIPELINE-AND-INTEGRATION.md` — ระบุ required/optional/ชนิด/ตัวอย่าง)
   - รูปแบบวันที่ที่รองรับ (`YYYY-MM-DD`, `YYYYMMDD`, `DD/MM/YYYY` รวม พ.ศ.) + mov_code → orderType mapping table
   - ตัวอย่าง request/response ครบทั้ง 3 endpoints (curl + JSON) รวมเคส error รายแถว
   - ข้อจำกัด: 1,000 records/คำขอ, error semantics, แนวทาง retry, การ dedupe (`orderNo`)
   - `freshness-check` สำหรับฝั่ง payroll: วิธีถามสถานะก่อนจ่ายเงิน + `payrollAction` (HOLD_AND_REVISE / PROCEED)
3. **Pull ด้วย SQL Views:** ขั้นตอนสร้าง views (`scripts/dpis-integration-pipeline.sql`), สิ่งที่ต้องเตรียม (DB account read-only, เครื่อง agent, ปฏิทินการรัน), ตัวอย่างตั้งเวลา
4. **Checklist การเชื่อมต่อ** — ทีละขั้นตอนตั้งแต่ขอ secret จน smoke test ผ่าน
5. **FAQ + ติดต่อ**

### Task 5.2: Smoke test script ให้ฝั่ง DPIS ยืนยันการเชื่อมต่อ
**File:** `scripts/dpis-smoke-test.sh` หรือ `.ts` (NEW) — ส่ง record ทดสอบ 1 รายการไปทั้ง 3 endpoints แล้วพิมพ์ผล PASS/FAIL อ่านง่าย

**Verify:** คู่มือ + smoke script ทดลองตามด้วย staging URL ได้จริง (หรือ localhost ใน dev)

---

## ลำดับการทำงานแนะนำ

```
ทันที:    Phase 5 (คู่มือ + smoke script)  ← ส่งมอบฝั่ง DPIS เริ่มประสานได้เลย
ทันที:    Phase 1 (refactor + dedupe)     ← ไม่ต้องรออะไร
รอ Q1–Q5: Phase 2 → 3A (agent)  →  ทดลองใช้จริงรอบแรก
ตามหลัง:  Phase 4 (ประวัติเงินเดือน)  →  Phase 3B (ถ้าเลือกรูปแบบ B)
```

## งานที่เกี่ยวข้องแต่แยกไว้ (ไม่อยู่ในแผนนี้)
- Rate limiting ของ integration endpoints (ต้องมี infra กลาง เช่น Upstash)
- การตัด PII ออกจาก freshness-check (รอผลถามฝั่ง payroll ว่าใช้ field ไหน)
- แก้ cron cleanup-previews ให้ fail-closed + proxy exception สำหรับ `/api/cron/*` (ควรทำร่วม Phase 3B)
