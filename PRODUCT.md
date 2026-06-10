# Product

## Register

product

## Users

**Primary:** เจ้าหน้าที่ HR/บุคคลที่ตรวจสอบความถูกต้องของคำสั่งข้าราชการ ก่อนและระหว่าง payroll cycle — ต้องหาคำสั่งที่ stale ได้เร็ว ไม่พลาด และไม่กลัวกดผิด

**Secondary:** ผู้ดูแลระบบ HR — นำเข้า/อนุมัติชุดคำสั่ง (batch), ตรวจ audit trail, จัดการข้อมูลข้าราชการ

**Context:** ใช้งานบน desktop ในหน่วยงานราชการ มักเปิดหลายหน้าพร้อมกัน (dashboard → stale report → order detail) ภาษาไทยเป็นหลัก วันที่ธุรกิจเป็น พ.ศ.

## Product Purpose

Salary Detech (HR Order Freshness Check) ตรวจว่าข้อมูลที่ snapshot ในคำสั่งข้าราชการตรงกับข้อเท็จจริง ณ `effective_date` ของคำสั่งนั้น — เมื่อมีคำสั่งใหม่ (เลื่อนเงินเดือน, ย้าย, โอน, ลาออก ฯลฯ) ที่กระทบคำสั่งเก่า ระบบแจ้งว่าคำสั่งใดต้องแก้ไข

**Success looks like:**
- หาและแก้คำสั่ง stale ได้เร็ว ลดความเสี่ยงข้อมูลผิดใน payroll
- นำเข้า/อนุมัติ batch คำสั่งได้ลื่น workflow ชัด
- มั่นใจว่าข้อมูลตรง effective_date และมี audit trail ตรวจสอบได้

## Brand Personality

**Warm, supportive, trustworthy** — อบอุ่น ช่วยเหลือ ลดความกลัวผิดพลาด

- ภาษาไทยชัด ไม่ใช้ศัพท์เทคนิคโดยไม่จำเป็น
- แจ้งปัญหา stale ด้วยโทนที่ช่วยให้ action ได้ ไม่ใช่แค่เตือนแล้วทิ้ง
- Guidance ชัดในจุดที่ workflow ซับซ้อน (batch preview/approve, freshness flags)
- ดูเป็นทางการพอสำหรับหน่วยงานราชการ แต่ไม่เย็นชาหรือน่ากลัว

## Anti-references

- **SaaS marketing template:** gradient hero, identical card grids, buzzwords (streamline, empower, seamless)
- **Dense data overwhelm:** ตารางแน่น ตัวอักษรเล็ก ข้อมูลท่วม ไม่มี visual hierarchy
- **Generic AI slop:** side-stripe borders, gradient text, glassmorphism ตกแต่ง, eyebrow labels ทุก section
- **Mixed language without purpose:** ปน EN/TH โดยไม่จำเป็น (ยกเว้นสถานะที่ E2E/tests ยัง assert ค่าอังกฤษ)

## Design Principles

1. **Clarity over density** — แสดงเฉพาะข้อมูลที่ช่วยตัดสินใจได้ในแต่ละหน้า; stale flags และ effective date ต้องเห็นทันที
2. **Workflow-first navigation** — เชื่อม dashboard → stale report → order detail → batch โดยไม่ต้องจำ URL
3. **Thai-first, date-honest** — วันที่ธุรกิจเป็น พ.ศ. ผ่าน `toThaiDate`; copy และ labels ภาษาไทยสม่ำเสมอ
4. **Single source of truth** — freshness logic, order labels, stale queries อยู่ที่ `lib/freshness.ts` และ `lib/order-types.ts` ไม่ duplicate ใน UI
5. **Supportive feedback** — toast, empty states, และ error messages บอกว่าต้องทำอะไรต่อ ไม่ใช่แค่ "error"

## Accessibility & Inclusion

- **WCAG 2.2 Level AA:** contrast ≥4.5:1 สำหรับ body text, keyboard navigation, semantic HTML, ARIA เมื่อจำเป็น
- **Thai-first:** Noto Sans Thai, อ่านง่ย ไม่ปน EN โดยไม่จำเป็น, วันที่ พ.ศ. สม่ำเสมอ
- **Reduced motion:** animation ต้องมี fallback เมื่อ `prefers-reduced-motion: reduce` (เมื่อเพิ่ม motion ในอนาคต)
