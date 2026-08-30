# การประเมินงานนอกแผน P7 (Rate Limiting / การตัด PII / Hosting ในประเทศ)

> เอกสารประเมินสำหรับงานที่แผน P7 ระบุว่า "เกี่ยวข้องแต่แยกไว้" (docs/plans/2026-08-23-p7-dpis-scheduled-pull-and-guide.md — ท้ายแผน)
> สถานะ ณ 30 ส.ค. 2569 — แต่ละเรื่องมี "สิ่งที่ต้องตัดสิน/ต้องรอ" กำกับอยู่ชัดเจน อ่านก่อนลงมือ implement

---

## 1. Rate Limiting ของ Integration Endpoints

### สถานะปัจจุบัน
- `/api/v1/integrations/*` มีการป้องกัน: Bearer auth (fail-closed, timing-safe), zod รายแถว, cap 1,000 รายการ/คำขอ และ 500 ids/คำขอ (`lib/validation/integration-schema.ts`)
- **ยังไม่มีการจำกัดจำนวน request ต่อหน่วยเวลา** — คนถือ secret สามารถยิงถี่เท่าไรก็ได้

### ข้อจำกัดสำคัญ (ตัดสินใจแทนไม่ได้)
ระบบ deploy บน **Vercel (serverless)** — instance ไม่ใช่ตัวเดียวกันและ memory ไม่คงอยู่ ทำให้ rate limiter แบบ in-memory ธรรมดา (นับในตัวแปร global) **บังคับไม่ได้จริง** เพราะแต่ละ instance นับกันคนละชุด จึงต้องมี infra กลางก่อน implement จริง

### ทางเลือก

| ทางเลือก | กลไก | ข้อดี | ข้อเสีย |
|----------|------|-------|---------|
| **A. Upstash Redis (แนะนำ)** | `@upstash/ratelimit` sliding window ผ่าน REST | ทำงานกับ Vercel serverless โดยตรง, มี free tier, ติดตั้งเร็ว | เพิ่ม dependency + ต้นทุนรายเดือนเมื่อใช้จริงจัง, request ต้องเรียก Redis ทุกครั้ง (+ latency ~ms) |
| B. Vercel WAF / rate rules | ตั้งที่ระดับแพลตฟอร์ม | ไม่แตะโค้ด | ต้องใช้แพ็กเกจ Vercel ที่เปิดใช้ WAF; จำกัดความละเอียดต่อ Bearer token ได้จำกัด |
| C. In-memory per-instance | นับใน globalThis | ไม่ต้องมี infra | **ไม่ sound บน serverless** — ใช้ได้เฉพาะตอนรัน self-host ตัวเดียว |

### แนวทางที่แนะนำ (เมื่อได้ Upstash)
1. เพิ่ม env `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
2. สร้าง `lib/rate-limit.ts` — sliding window เช่น **60 requests/นาที ต่อ 1 ช่องทางเรียก** (แยก fingerprint ตาม UA/IP ไม่ได้เชื่อถือ — ใช้ secret เดียวกันทั้งระบบ จึงนับรวมทั้ง endpoint ชุด integrations แล้วพอ)
3. เรียกใน `requireIntegrationSecret` (`lib/integration-auth.ts`) หลัง auth ผ่าน — จุดเดียวครอบทั้ง 3 endpoints ไม่ต้องแก้ route
4. ตอบ `429` พร้อม header `Retry-After`
5. **ตัดสินใจ fail-open/fail-closed:** ถ้า Redis ล่ม — แนะนำ **fail-open** (ปล่อยผ่าน + log warning) เพราะ auth ยังปิดอยู่และฝั่ง DPIS เป็น partner ที่รู้จัก ไม่ใช่ public internet; ต่างจาก auth ที่ fail-closed เพราะ auth คือประตู ส่วน rate limit คือระบบช่วยหายใจ
6. เพิ่ม tests: เกิน limit → 429 / ต่ำกว่า limit → ผ่าน / Redis ล่ม → ผ่านแบบ fail-open

### สิ่งที่ต้องตัดสินก่อนเริ่ม
- อนุมัติบัญชี Upstash (หรือ infra กลางอื่น) + งบ
- ตัวเลข quota ตามปริมาณจริงจาก Q7 (จำนวนรอบซิงค์ต่อวัน × ขนาด batch)

---

## 2. การตัด PII ออกจาก Freshness-check

### สถานะปัจจุบัน
`POST /api/v1/integrations/freshness-check` ตอบกลับข้อมูลบุคคลครบชุด: `employee.citizenId`, `employee.name`, `employee.id` — ฝั่ง payroll ใช้จับคู่รายการจ่ายกับคำสั่ง

### สิ่งที่ต้องรอ (บล็อกจริง)
**คำตอบจากฝั่ง payroll ว่าต้องใช้ field ใดในการจับคู่รายการ** — ถ้า payroll จับคู่ด้วย `orderNo` หรือ `orderId` อย่างเดียว เราตัด `citizenId` + `name` ออกได้ทันที แต่ถ้า payroll ไม่มีระบบ id ของตัวเองและต้องใช้เลขบัตร/ชื่อ การตัดจะทำให้ใช้งานไม่ได้ จึงห้ามตัดก่อนได้คำตอบ (ประเด็นเดียวกับ handoff ก่อนหน้า)

### ทางเลือกเมื่อได้คำตอบ

| ทางเลือก | วิธี | ผลข้างเคียง |
|----------|------|-------------|
| **A. ตัดฟิลด์ตรง (แนะนำถ้า payroll ใช้ orderNo/orderId)** | ลบ `employee` block ออกจาก response หรือคงแต่ `employee.id` | response เล็กลง, ไม่กระทบ contract เพราา payroll ยืนยันแล้วว่าไม่ใช้ |
| B. Query param `fields=minimal` (additive) | เรียกด้วย param จะไม่ได้ PII; เรียกปกติได้เหมือนเดิม | PII ยังออกได้ถ้าไม่ส่ง param — แก้แค่ครึ่งทาง |
| C. Hash เลขบัตร | ส่ง `citizenIdHash` (SHA-256 + salt ฝั่ง server) | payroll ต้องแก้ระบบจับคู่ — ยุ่งที่สุด ใช้เมื่อจำเป็นต้องจับคู่ด้วยเลขบัตรแต่ไม่อยากส่งชัด ๆ |

### จุดแก้เมื่อดำเนินการ
- `app/api/v1/integrations/freshness-check/route.ts` — บล็อก `employee` ใน `evaluated.push`
- `__tests__/api/integrations.test.ts` — ปรับ assertions ที่อ่าน `entry.employee.citizenId`
- `docs/DATA-PIPELINE-AND-INTEGRATION.md` §4 + `docs/DPIS-INTEGRATION-GUIDE.md` §2.7 — ปรับตัวอย่าง response
- **ข้อควรระวัง:** Push API contract เปลี่ยนได้แบบ additive เท่านั้น — การตัดฟิลด์ออกต้องประสานฝั่งผู้ใช้ endpoint นี้ (payroll) ให้รับทราบก่อนเสมอ

---

## 3. การประเมิน Hosting ในประเทศ (กรณี Q6 ไม่อนุมัติคลาวด์ต่างประเทศ)

### บริบท
คำถาม Q6 ของแผน P7: อนุมัติ data governance ให้เก็บ PII (เลขบัตร เงินเดือน) บน Vercel + Turso (ต่างประเทศ) ได้หรือไม่ — **ถ้าไม่อนุมัติ กระทบทั้งระบบ** (ไม่ใช่แค่งานซิงค์) ต้องย้าย deployment

### ตารางเทียบทางเลือก

| | Vercel + Turso (ปัจจุบัน) | VPS/Cloud ในประเทศ + Docker | Managed K8s/Colo ในประเทศ |
|---|---|---|---|
| ข้อมูลอยู่ในไทย | ❌ | ✅ | ✅ |
| ต้นทุนเดือนละ (โดยประมาณ) | ~$0–20 (Hobby/Pro) | ~500–2,000 บาท (2–4 vCPU VPS) | หลักพัน–หมื่นบาท |
| งานดูแล | น้อยมาก (managed) | ปานกลาง (OS patch, backup, TLS, monitoring) | สูง (ต้องมีทีมดูแล) |
| CI/CD | มีอยู่แล้ว (GitHub → Vercel) | ต้องตั้งเอง (GitHub Actions → SSH/registry + compose pull) | ต้องออกแบบ |
| Cron | Vercel Cron (`vercel.json`) | OS cron / Task Scheduler เหมือนแผน P7 agent | เหมือน VPS |
| Error tracking (Sentry) | cloud ต่างประเทศ (เฉพาะ error log ไม่มี PII) | ใช้ต่อได้ หรือ self-host ถ้ากำกับเข้ม | เหมือน VPS |
| การ scale | อัตโนมัติ | ทำมือ (vertical ก่อน พอสำหรับระดับหน่วยงาน) | horizontal ได้ |
| ความเสี่ยงหลัก | Q6/governance | single machine — ต้องมี backup + แผน recovery จริงจัง | ค่าใช้จ่าย/คน |

### แนวทางสถาปัตยกรรมถ้าย้าย (VPS ในไทย)
1. **App:** Next.js รันผ่าน Docker Compose (`node:20` + `next start`) หลัง reverse proxy (Caddy/Nginx + TLS Let's Encrypt)
2. **DB:** เลือกได้ 2 ทาง — (ก) Turso/LiteFS self-host หรือ (ข) **SQLite ไฟล์เดียวบนดิสก์ + backup ตามรอบ** (ขนาดข้อมูลระดับหน่วยงานจาก Q7 ยังเบามาก) — `lib/prisma.ts` ใช้ adapter-libsql อยู่แล้ว สลับ URL เป็น `file:...` หรือ libsql ในประเทศได้ทันทีโดยไม่แก้โค้ด
3. **Cron:** ย้าย `cleanup-previews` เป็น OS cron เรียก endpoint เดิมด้วย `CRON_SECRET` (รูปแบบเดียวกับ agent ของแผน P7)
4. **Integration pull agent (P7 Phase 3A):** วางบนเครื่องเดียวกับ app ได้เลย — เครือข่ายราชการ↔VPS ไทยคุยกันง่ายกว่าเดิม
5. **Deploy pipeline:** GitHub Actions build image → push registry → SSH ไป VPS `docker compose pull && up -d`
6. **ข้อมูลที่ต้องเตรียมก่อนตัดสิน:** ผล Q6, ข้อกำหนด IT ของหน่วยงาน (ใครเป็นผู้ดูแล server, สิทธิ์เข้า DC/IDC), จำนวนผู้ใช้ concurrent จริง

### ข้อเสนอแนะ
- **ยังไม่ย้ายจนกว่า Q6 จะชัด** — ต้นทุนย้าย (โดยเฉพาะการดูแล server ระยะยาว) สูงกว่าค่าบริการ cloud อย่างชัดเจนที่ขนาดปัจจุบัน
- เตรียมความพร้อมล่วงหน้าที่ทำได้โดยไม่ผูกกับผล Q6: คงการเข้าถึง DB ผ่าน adapter เดียว (`lib/prisma.ts` ✓ ทำอยู่แล้ว), คง cron ผ่าน HTTP+secret (✓), หลีกเลี่ยง API เฉพาะของ Vercel ในโค้ดแอป (ตอนนี้ไม่มี ✓)
- จุดเดียวที่ผูกกับ Vercel จริงคือ deploy + cron schedule (`vercel.json`) — ทั้งหมดอยู่ในไฟล์ config เดียว ย้ายง่าย

---

## สรุปสถานะการตัดสินใจ

| เรื่อง | สิ่งที่ต้องรอ/ตัดสิน | พร้อมลงมือเมื่อ |
|--------|---------------------|-----------------|
| Rate limiting | อนุมัติ infra กลาง (Upstash) + quota จากผล Q7 | ได้บัญชี + ตัวเลขปริมาณ |
| ตัด PII จาก freshness-check | คำตอบฝั่ง payroll ว่าจับคู่ด้วย field ใด | ได้คำตอบ (ทางเลือก A ใช้เวลา ~ครึ่งวัน) |
| Hosting ในประเทศ | ผล Q6 + ข้อกำหนด IT หน่วยงาน | Q6 ไม่อนุมัติเท่านั้น (ก่อนหน้านั้นห้ามย้าย) |
