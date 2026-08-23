# P7 — DPIS Scheduled Pull & Integration Guide — Implementation Plan

> Revision 2026-08-23 (2): แก้ไขตาม code review 11 findings — พลิกบทบาท watermark เป็น optimization, เพิ่มคำถาม data governance/ปริมาณข้อมูล, แก้ dedupe ประวัติเงินเดือนด้วย source_id, ระบุพฤติกรรมข้อมูลซ้ำที่เปลี่ยน, แก้ cron fail-closed

## Goal
1. สร้าง**ตัวดึงข้อมูล DPIS แบบตั้งเวลา** (ทางเลือกที่ 2 — Pull ผ่าน SQL Views) ที่ใช้ pipeline เดียวกับ push API ที่มีอยู่
2. เขียน**คู่มือการเชื่อมต่อสำหรับฝั่ง DPIS** (ทางเลือกที่ 1 — Push API) เป็นเอกสารส่งมอบให้ทีม DPIS ใช้ลงมือเชื่อมต่อได้จริง

## หลักคิดสำคัญของแผน (สำคัญ — อ่านก่อนตัดสินใจทำ Task ใดๆ)

**โครงสร้างที่มีอยู่แล้ว (ไม่ต้องสร้างใหม่):**
- SQL Views 3 ตัวบนฐานข้อมูล DPIS: `scripts/dpis-integration-pipeline.sql` (`vw_dpis_salary_detech_person`, `vw_dpis_salary_detech_order`, `vw_dpis_salary_detech_salary_history`)
- Push API 3 endpoints พร้อม auth + zod + caps (PR #16)
- Mapping engine `lib/dpis-mapping.ts`, zod contracts `lib/validation/integration-schema.ts`

**หลักการที่ 1 — Correctness มาจาก idempotency ไม่ใช่ watermark:**
การรันซ้ำกี่รอบต้องได้ผลเหมือนเดิมด้วยกลไก **(ก) upsert คนตาม citizenId** และ **(ข) dedupe/อัปเดตคำสั่งตาม (orderNo, employeeId)** เท่านั้น Watermark แบบ date/id จับการ "แก้แถวเดิม" ไม่ได้ (เงินเดือน/ตำแหน่งของคนเดิมเปลี่ยน = แก้แถวเดิม ไม่ใช่แถวใหม่) และ `cmd_date` เป็นวันที่มีผล ไม่ใช่วันที่บันทึก — คำสั่งย้อนหลังเข้าทีหลังได้
**MVP จึงเป็น "full snapshot idempotent ทุกรอบ"** (ดู Q7 เรื่องปริมาณ) ส่วน incremental watermark เป็น **optimization** ทำทีหลังเฉพาะเมื่อได้ `updated_at` จริงจาก Q4

**หลักการที่ 2 — ข้อจำกัดเครือข่ายกำหนดตำแหน่งวางตัวดึงข้อมูล:**
ฐานข้อมูล DPIS โดยทั่วไปอยู่ในเครือข่ายราชการ (intranet) — Vercel เข้าไปดึงตรงๆ ไม่ได้:

| รูปแบบ | วางตัวดึงข้อมูลไว้ที่ | การเดินข้อมูล | ข้อแลกเปลี่ยน |
|--------|---------------------|---------------|---------------|
| **A-1. On-prem Agent + Push API** | เครื่อง/VM ในเครือข่ายราชการ | ดึง Views → ยิง outbound HTTPS ไป push API | ไม่ถือ credential ของ DB เราบนเครื่องราชการ / SyncRun ต้องรายงานผ่าน endpoint (optional) หรือดูจาก run-log ในเครื่อง agent |
| **A-2. On-prem Agent + เขียน DB ตรง** | เครื่อง/VM ในเครือข่ายราชการ | ดึง Views → เขียนตรงเข้า DB เรา (`TURSO_DATABASE_URL`) ผ่าน sync core เดียวกัน | sync.ts วิ่งเต็มรูปแบบ (SyncRun ใน DB เราได้) แต่ต้องถือ credential DB บนเครื่องราชการ |
| **B. Vercel Cron ดึงตรง** | Route บน Vercel → ต่อ DB DPIS ที่เปิดให้ภายนอกได้ | Vercel → replica/endpoint ของ DPIS | ต้องมี endpoint สาธารณะ + allowlist — มักได้ยากในหน่วยงานรัฐ |

**ข้อสังเกต:** A-1 กับ B ส่ง PII ขึ้นคลาวด์ต่างประเทศ (Vercel/Turso) — ต้องผ่าน Q6 ก่อน A-2 ก็เขียนลงคลาวด์เหมือนกัน ถ้า Q6 ไม่ผ่านทั้งหมด ต้องพิจารณา hosting ในประเทศ (กระทบ deployment ทั้งระบบ ไม่ใช่แค่งานซิงค์)

**หลักการที่ 3:** ตัวดึงข้อมูล**ห้าม**เขียน upsert/freshness logic ใหม่ — reuse pipeline เดิม (zod → mapping → upsert → `validateOrderFreshness` → `cascadeStaleCheck`) ตามกติกา repo เรื่องการรวมศูนย์ domain logic ทั้ง 3 รูปแบบใช้ "แกนกลาง" โค้ดชุดเดียว ต่างกันแค่ตัวรัน

## Constraints
- Follow existing patterns: Prisma direct, `@/` alias, Thai error/label เฉพาะ UI, API messages เป็นอังกฤษ
- Push API contract เปลี่ยนได้แบบ **additive เท่านั้น** (เพิ่ม field ได้ ห้ามลบ/แก้ field เดิม) — กระทบคู่มือ Phase 5 ด้วย
- ทุก task จบด้วย `npx tsx __tests__/run.ts` + `npm run lint` ผ่านก่อนเริ่ม task ถัดไป
- Phase/branch ใหม่ทุกครั้งตามกติกา AGENTS.md
- Next.js 16 — ตรวจ `node_modules/next/dist/docs/` ก่อนใช้ API ของ Next

---

## Phase 0 — ข้อมูลที่ต้องได้จากฝั่ง DPIS ก่อนเริ่ม

| # | คำถาม | ผลกระทบต่อแผน |
|---|-------|---------------|
| Q1 | ฐานข้อมูล DPIS เป็น engine อะไร (MySQL/Oracle/SQL Server/PostgreSQL)? | เลือก driver — **ตัดสินใจหลังได้คำตอบเท่านั้น** (SQL template ปัจจุบันเขียนสไตล์ MySQL เพราะเป็นตัวอย่าง ไม่ใช่ข้อเท็จจริงของ DPIS จริง) |
| Q2 | มีเครื่อง/VM ในเครือข่ายราชการให้รัน agent หรือไม่? | ไม่มี → เหลือทาง B เท่านั้น |
| Q3 | Views ที่เราส่ง SQL ให้ไปสร้างบนฐานข้อมูลจริงได้เลยหรือต้องปรับ? | ปรับ `scripts/dpis-integration-pipeline.sql` ให้ตรง dialect |
| Q4 | มีคอลัมน์บอก "แถวนี้ถูกแก้ไขเมื่อ" (updated_at/last_update) หรือไม่? | มี → ทำ Task 2.4 (optimization) ได้ / ไม่มี → อยู่กับ full snapshot (ยังถูกต้องเพราะ idempotent) — **ไม่ block MVP** |
| Q5 | ได้ DB account แบบ read-only หรือไม่? | ต้องเป็น read-only เท่านั้น |
| **Q6** | **อนุมัติด้าน data governance ให้ส่ง/เก็บ PII (เลขบัตร เงินเดือน) บน Vercel + Turso (ต่างประเทศ) ได้หรือไม่?** | **กำหนดว่าเลือกรูปแบบใดได้:** ไม่อนุมัติเลย → ต้องพิจารณา hosting ในประเทศทั้งระบบ (ตัดสินระดับสถาปัตยกรรม ไม่ใช่แค่งานซิงค์) |
| **Q7** | **ปริมาณข้อมูลโดยประมาณ: จำนวนข้าราชการ / คำสั่ง / แถวประวัติเงินเดือน** | ใช้ยืนยันว่า "full snapshot ทุกรอบ" รับไหว (เช่น 5,000 คน × 20 คำสั่ง ≈ แสนแถว ยังสบายกับ chunk 500) และประเมินเวลา backfill Phase 4 |

**หมายเหตุ:** Phase 1 (refactor) และ Phase 5 (คู่มือ) เริ่มทำได้เลยไม่ต้องรอคำตอบ

---

## Phase 1 — ถอด shared ingest service จาก push routes (ไม่เปลี่ยน behavior เดิม, เพิ่ม additive)

**เหตุผล:** ตัวดึงข้อมูลและ push API ต้องใช้ pipeline เดียวกัน + แก้จุดอ่อน duplicate ของ orders/sync ไปพร้อมกัน (สำคัญมากสำหรับ pull ที่รันซ้ำทุกวัน)

### Task 1.1: สร้าง `lib/dpis-ingest.ts`
**File:** `lib/dpis-ingest.ts` (NEW) — ย้าย loop logic จาก `app/api/v1/integrations/*/route.ts` มาเป็น service:
- `ingestPersons(records: unknown[]): SyncResult` — zod → mapping → upsert by citizenId (เดิมจาก employees/sync)
- `ingestOrders(records: unknown[]): SyncResult` — zod → resolve person → **dedupe ก่อน create** → `validateOrderFreshness` + `cascadeStaleCheck` (เดิมจาก orders/sync)
- **กติกา dedupe (ระบุชัดเจน — ต้นทาง DPIS คือความจริง):** ค้น `findFirst({ where: { orderNo, employeeId } })` เมื่อ orderNo ไม่ใช่ null:
  - **ซ้ำ + ข้อมูล snapshot ไม่เปลี่ยน** → ข้าม นับใน `results.skipped`
  - **ซ้ำ + ข้อมูลเปลี่ยน** → `update` ฟิลด์ snapshot ให้ตรงต้นทาง + เรียก `validateOrderFreshness` + `cascadeStaleCheck` ใหม่ (เหมือนเส้นทาง create) + นับใน `results.updated`
  - **orderNo เป็น null** → ไม่ dedupe (สร้างตามเดิม) — เหตุผล: ไม่มีคีย์ และนี่คือช่องทาง push แบบ one-off

### Task 1.2: Routes เรียก service
**File:** แก้ 2 routes (`employees/sync`, `orders/sync`) ให้เหลือแค่ auth + แปลง body + เรียก service
**Verify:** response shape เปลี่ยนแบบ **additive เท่านั้น** (เพิ่ม `skipped`/`updatedOrders` ได้ — ห้ามลบ/แก้ field เดิม) + `npx tsx __tests__/run.ts` ผ่าน + เพิ่ม tests:
- push orderNo ซ้ำ 2 ครั้งข้อมูลเหมือนกัน → `created: 1, skipped: 1` ฐานข้อมูลมี 1 แถว
- push orderNo ซ้ำแต่ `cmd_salary` เปลี่ยน → `updated` นับ 1 และฐานข้อมูลได้ค่าใหม่ + freshness ถูก validate ใหม่
**Note:** `freshness-check` route ไม่ต้องย้าย (ไม่มี ingest) · พฤติกรรมใหม่นี้ต้อง**เขียนลงคู่มือ Task 5.1** เพราะเป็นการเปลี่ยน contract

---

## Phase 2 — Puller core: อ่าน Views + รัน full snapshot idempotent (รอผล Q1)

### Task 2.1: Prisma model `SyncRun` (observability ของการซิงค์)
**File:** `prisma/schema.prisma` (เพิ่ม model) + `npx prisma db push`
```
SyncRun { id, mode ("agent-db"|"agent-api"|"cron"), status ("running"|"success"|"failed"),
          startedAt, finishedAt, stats Json,   // {personsCreated, personsUpdated, ordersCreated, ordersSkipped, ordersUpdated, errors[]}
          watermark Json? }                     // optional — ใช้เมื่อ Task 2.4 เปิดใช้งาน
```
**หมายเหตุ:** A-1 (push ผ่าน API) เขียน SyncRun ใน DB เราไม่ได้ — ดู Task 3.1 เรื่อง run-log ในเครื่อง + endpoint รายงานผลแบบ optional

### Task 2.2: `lib/dpis-pull/source.ts` — ตัวอ่านฐานข้อมูล DPIS
**File:** `lib/dpis-pull/source.ts` (NEW)
- `readView(view, { limit, offset })` — query ผ่าน driver **ตามคำตอบ Q1** (ติดตั้งเฉพาะ driver ที่ตรงจริง อย่าตั้งชื่อ MVP driver ล่วงหน้า)
- env: `DPIS_DB_URL` (+ `DPIS_DB_TYPE`), ไม่ตั้ง → throw พร้อมข้อความชัดเจน (fail-closed ตามสไตล์ `lib/integration-auth.ts`)
- **ห้าม** SELECT * — ระบุคอลัมน์ตาม Views เท่านั้น, อ่านอย่างเดียว

### Task 2.3: `lib/dpis-pull/sync.ts` — orchestrate 1 รอบซิงค์ (full snapshot)
**File:** `lib/dpis-pull/sync.ts` (NEW)
- ลำดับ: **persons ก่อน → orders ตาม** (คำสั่งอ้างคน ต้องมีคนก่อน — สอดคล้อง error "Please sync employee first")
- **MVP = full snapshot ทุกรอบ:** อ่านทั้ง view แบบ chunk ทีละ 500 → ผ่าน `ingestPersons`/`ingestOrders` (idempotent โดยกลไก Task 1.1 — รันซ้ำได้ผลเดิม)
- เขียน `SyncRun` (status running → success/failed + stats) — สำหรับ A-2/B; A-1 ดู Task 3.1
- **ก่อน fullSync รอบแรกของแต่ละระบบจริง: export/backup ฐานข้อมูลเสมอ**
- **view ที่ 3 (salary_history):** ยังไม่นำเข้าใน phase นี้ — Phase 4

### Task 2.4 (Optional — เปิดเฉพาะเมื่อ Q4 ตอบว่ามี `updated_at`): incremental watermark
- ใช้ `updated_at` จากฐานข้อมูลจริงเท่านั้น (ห้ามใช้ `cmd_date`/id แทน — ไม่ sound) เก็บใน `SyncRun.watermark`
- เป็น optimization ลดปริมาณ — correctness ยังยึด idempotency ของ Task 1.1 อยู่ดี

**Verify (Phase 2):** tests ด้วย fake source (fixture rows จาก view) → ผ่าน ingest services → ตรวจข้อมูลใน DB + SyncRun + **รันซ้ำ 2 รอบได้ผล idempotent** (รอบสอง: created=0, skipped=ทั้งหมด)

---

## Phase 3 — Runner (ใช้ sync core ร่วมกัน)

### Task 3.1: สคริปต์สำหรับรูปแบบ A (On-prem Agent) — แนะนำทำก่อน
**File:** `scripts/dpis-pull-agent.ts` (NEW)
- โหมด: `--dry-run` (อ่าน + validate + พิมพ์ summary แต่ไม่เขียน), `--limit N`
- เลือกทางเดินข้อมูลด้วย env:
  - **A-1 (default):** push ไป push API ของเรา (`SALARY_DETECH_URL` + `INTEGRATION_SECRET`) — ผ่าน auth/zod/freshness เต็มระบบ, ไม่ต้องถือ credential DB บนเครื่องราชการ
  - **A-2:** เขียนตรงเข้า DB เรา (`TURSO_DATABASE_URL`) — sync core วิ่งเต็มรูปแบบ + SyncRun ใน DB เรา
- **Observability ขั้นต่ำ (ทุกโหมด):** พิมพ์ summary อ่านง่าย + **exit code ≠ 0 เมื่อ failed** (ต่อกับ alert ของตัวจัดตาราง OS ได้ทันที) + เขียน run-log JSON ลงไฟล์ในเครื่อง (เก็บรอบละไฟล์)
- **Optional (ทำเมื่อต้องการดูศูนย์กลาง):** endpoint `/api/v1/integrations/sync-runs` (auth เหมือน push API) ให้ A-1 รายงานผลเข้า SyncRun ของเรา
- ตัวจัดตาราง: Task Scheduler (Windows) / cron (Linux) — ยกตัวอย่างคำสั่งในคู่มือ
- **ห้าม hardcode secrets** — อ่านจาก env ของเครื่อง agent เท่านั้น

### Task 3.2 (Optional, รอผล Q2 + Q6): Vercel Cron route สำหรับรูปแบบ B
**File:** `app/api/cron/dpis-pull/route.ts` (NEW) + `vercel.json` เพิ่ม cron entry
- GET + ตรวจ `CRON_SECRET` แบบ **fail-closed**
- **แก้พร้อมกันใน branch เดียวกัน:** `app/api/cron/cleanup-previews/route.ts` ปัจจุบัน fail-open (ถ้าไม่ตั้ง `CRON_SECRET` จะปล่อยผ่านทุกคน) — แก้เป็น fail-closed (งาน ~3 บรรทัด ไม่ควรเลื่อน)
- **ตรวจก่อน:** proxy (`app/proxy.ts`) ไม่ได้ยกเว้น `/api/cron/*` → Vercel Cron จริงอาจโดน redirect ไป /login — เพิ่ม exception หรือยืนยันพฤติกรรมจริงของ Next 16 proxy ต่อ cron headers

**Verify:** รัน agent แบบ `--dry-run --limit 10` กับฐานข้อมูลจำลอง (docker ตาม engine จริงจาก Q1 + import sample DPIS tables) — พิมพ์ summary ถูกต้อง + จำลอง error แล้ว exit code ต้อง ≠ 0

---

## Phase 4 — นำเข้าประวัติเงินเดือนย้อนหลัง (view ที่ 3)

**ทำท้ายสุดเพราะกระทบ domain:** `getMaxSalaryEffectiveDate` อ่านจาก `Order` (orderType กลุ่มเงินเดือน, status active) — ประวัติเงินเดือนจาก DPIS ต้องแปลงเป็นคำสั่งเงินเดือนเพื่อให้ check "salary_as_of_date" มีฐานเทียบย้อนหลัง (ตอนนี้คนที่ sync ใหม่ไม่มีประวัติ → คำสั่งเก่าไม่ถูก flag)

### Task 4.1: mapping `vw_dpis_salary_detech_salary_history` → Order
- แต่ละแถว → order `orderType: "salary_increase"` (หรือตาม mov_code ถ้ามี), `orderStatus: "active"`, `salaryAsOfDate = effectiveDate`
- **Dedupe key สำหรับ historical (คีย์ปกติใช้ไม่ได้เพราะ `sah_docno` อาจเป็น null):** map `source_id` (`sah_id` จาก view) เป็น `orderNo = "SAH-<source_id>"` → ใช้กลไก dedupe (orderNo, employeeId) เดิมได้ทันที ไม่ต้องแก้ schema (ทางเลือก hardening ภายหลัง: คอลัมน์ `sourceId` + unique constraint)
- **อ่านสถานการณ์ A–J ใน `hr-order-freshness-check-v2.md` ก่อน** (โดยเฉพาะ B, C4, H) — กติกาบังคับของ repo ก่อนแตะข้อมูลที่เข้า freshness engine

### Task 4.2: แผนรับมือ cascade จาก backfill (สำคัญ — ห้ามข้าม)
Backfill ประวัติเงินเดือนจะทำให้คำสั่ง active เดิมที่ `salary_as_of_date` เก่ากว่าประวัติ**ถูกธง stale เป็นจำนวนมาก** — ตาม domain แล้วถูกต้อง (สถานการณ์ B) แต่ต้องบริหารความคาดหวัง:
- **ลำดับที่ดีที่สุด:** ทำ backfill **ก่อนเปิดใช้งานจริง** (ระบบยังไม่มีคำสั่ง active ของผู้ใช้ → ไม่มีอะไรโดนธง)
- ถ้าทำหลังเปิดใช้: รัน `--dry-run` บน staging → ตรวจ sample ผล cascade → **ประกาศให้ผู้ใช้ทราบล่วงหน้า** (จำนวนคำสั่งที่จะเปลี่ยนสี) → export/backup ก่อนรันจริง
- Run ครั้งแรกเป็น `fullSync` ครั้งเดียว (backfill) จากนั้นตามรอบปกติ (idempotent)

**Verify:** test — คนที่ import ประวัติแล้ว + คำสั่งใหม่ที่ `salary_as_of_date` เก่ากว่าประวัติ → `statusSalary: "stale"` ตามสถานการณ์ B + backfill ซ้ำ 2 รอบ → จำนวน order ไม่เพิ่ม

---

## Phase 5 — คู่มือการเชื่อมต่อสำหรับฝั่ง DPIS (ทำได้ทันที ไม่ต้องรอ Phase อื่น)

### Task 5.1: `docs/DPIS-INTEGRATION-GUIDE.md` (NEW — ภาษาไทยทั้งฉบับ สำหรับส่งมอบทีม DPIS)
โครงเรื่อง:
1. **ภาพรวม 2 ทางเลือก** — Push API (เร็วสุด เหมาะทำก่อน) / SQL Views + Agent (สำหรับรันอัตโนมัติ)
2. **Push API:**
   - Base URL + การขอ/ตั้งค่า `Authorization: Bearer <INTEGRATION_SECRET>`
   - ตารางฟิลด์ทั้ง 3 endpoints (ดึงจาก zod schemas + Data Mapping Matrix §3 ของ `DATA-PIPELINE-AND-INTEGRATION.md` — ระบุ required/optional/ชนิด/ตัวอย่าง)
   - รูปแบบวันที่ที่รองรับ (`YYYY-MM-DD`, `YYYYMMDD`, `DD/MM/YYYY` รวม พ.ศ.) + mov_code → orderType mapping table
   - **พฤติกรรมเมื่อส่งซ้ำ (จาก Task 1.1):** ข้อมูลเหมือนเดิม → skipped / ข้อมูลเปลี่ยน → อัปเดตตามต้นทาง — ระบุชัดเจน เพราะเป็น contract ที่เพิ่มภายหลัง
   - ตัวอย่าง request/response ครบทั้ง 3 endpoints (curl + JSON) รวมเคส error รายแถว
   - ข้อจำกัด: 1,000 records/คำขอ, error semantics, แนวทาง retry
   - `freshness-check` สำหรับฝั่ง payroll: วิธีถามสถานะก่อนจ่ายเงิน + `payrollAction` (HOLD_AND_REVISE / PROCEED)
3. **Pull ด้วย SQL Views:** ขั้นตอนสร้าง views (`scripts/dpis-integration-pipeline.sql`), สิ่งที่ต้องเตรียม (DB account read-only, เครื่อง agent, ปฏิทินการรัน), ตัวอย่างตั้งเวลา
4. **Checklist การเชื่อมต่อ** — ทีละขั้นตอนตั้งแต่ขอ secret จน smoke test ผ่าน
5. **FAQ + ติดต่อ**

### Task 5.2: Smoke test script ให้ฝั่ง DPIS ยืนยันการเชื่อมต่อ
**File:** `scripts/dpis-smoke-test.sh` หรือ `.ts` (NEW) — ส่ง record ทดสอบ 1 รายการไปทั้ง 3 endpoints แล้วพิมพ์ผล PASS/FAIL อ่านง่าย + exit code ตามผล

**Verify:** คู่มือ + smoke script ทดลองตามด้วย staging URL ได้จริง (หรือ localhost ใน dev)

---

## ลำดับการทำงานแนะนำ

```
ทันที:    Phase 5 (คู่มือ + smoke script)  ← ส่งมอบฝั่ง DPIS เริ่มประสานได้เลย
ทันที:    Phase 1 (refactor + dedupe)     ← ไม่ต้องรออะไร
รอ Q1–Q3, Q6, Q7: Phase 2 → 3A (agent)  →  ทดลองใช้จริงรอบแรก
ตามหลัง:  Phase 4 (ประวัติเงินเดือน — ดูแผนรับมือ cascade ก่อน)  →  Phase 3B (ถ้าเลือกรูปแบบ B)  →  Task 2.4 (ถ้ามี updated_at)
```

## งานที่เกี่ยวข้องแต่แยกไว้ (ไม่อยู่ในแผนนี้)
- Rate limiting ของ integration endpoints (ต้องมี infra กลาง เช่น Upstash)
- การตัด PII ออกจาก freshness-check (รอผลถามฝั่ง payroll ว่าใช้ field ไหน)
- การพิจารณา hosting ในประเทศ ถ้า Q6 ไม่อนุมัติคลาวด์ต่างประเทศ (ตัดสินระดับทั้งระบบ)
