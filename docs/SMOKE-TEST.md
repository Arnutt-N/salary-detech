# Smoke Test Checklist — salary-detech.vercel.app

**Production URL:** https://salary-detech.vercel.app  
**วันที่ทดสอบ:** _______________  
**ผู้ทดสอบ:** _______________  
**Credentials:** `ADMIN_USERNAME` / `ADMIN_PASSWORD` (จาก Vercel env)

---

## 0) ก่อนเริ่ม

- [ ] เปิด **Incognito / Private window** (ทดสอบ auth ให้ถูก)
- [ ] มีไฟล์ `docs/templates/import-sample-seed.xlsx` ในเครื่อง (สำหรับข้อ 6)

---

## 1) หน้า public / Auth gate

| # | ขั้นตอน | ผลที่คาดหวัง | Pass |
|---|---------|--------------|------|
| 1.1 | เปิด https://salary-detech.vercel.app/login | หน้า "Salary Audit" + ฟอร์ม ชื่อผู้ใช้/รหัสผ่าน | [ ] |
| 1.2 | เปิด https://salary-detech.vercel.app/dashboard (ยังไม่ login) | **redirect** ไป `/login?callbackUrl=/dashboard` | [ ] |
| 1.3 | เปิด https://salary-detech.vercel.app/batches (ยังไม่ login) | **redirect** ไป `/login` | [ ] |

---

## 2) Login

| # | ขั้นตอน | ผลที่คาดหวัง | Pass |
|---|---------|--------------|------|
| 2.1 | ใส่ username/password ผิด → กด **เข้าระบบ** | ข้อความ "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" | [ ] |
| 2.2 | ใส่ `ADMIN_USERNAME` / `ADMIN_PASSWORD` ถูก → กด **เข้าระบบ** | ไป `/dashboard` (หรือ callbackUrl ที่ตั้งไว้) | [ ] |
| 2.3 | Refresh หน้า dashboard | ยัง login อยู่ ไม่เด้งออก | [ ] |

---

## 3) Dashboard

| # | ขั้นตอน | ผลที่คาดหวัง | Pass |
|---|---------|--------------|------|
| 3.1 | เปิด https://salary-detech.vercel.app/dashboard | หน้า "แผงควบคุม" โหลดได้ **ไม่มี 500** | [ ] |
| 3.2 | ดูตัวเลข KPI (ต้องแก้ไข, ชุดคำสั่ง ฯลฯ) | แสดงตัวเลข (0 ก็ได้) ไม่ error | [ ] |
| 3.3 | ดูส่วน "กิจกรรมล่าสุด" / "คำสั่งที่ต้องแก้ไข" | แสดง empty state หรือรายการ ไม่ crash | [ ] |

---

## 4) Navigation หลัก

| # | URL | ผลที่คาดหวัง | Pass |
|---|-----|--------------|------|
| 4.1 | https://salary-detech.vercel.app/batches | รายการชุดคำสั่งโหลดได้ | [ ] |
| 4.2 | https://salary-detech.vercel.app/orders | รายการคำสั่งโหลดได้ | [ ] |
| 4.3 | https://salary-detech.vercel.app/employees | รายการข้าราชการโหลดได้ | [ ] |
| 4.4 | https://salary-detech.vercel.app/reports/stale | รายงาน stale โหลดได้ | [ ] |

---

## 5) API (หลัง login — เปิด tab ใหม่)

| # | URL | ผลที่คาดหวัง | Pass |
|---|-----|--------------|------|
| 5.1 | https://salary-detech.vercel.app/api/dashboard/summary | JSON `{ totalOrders, staleCount, ... }` | [ ] |
| 5.2 | https://salary-detech.vercel.app/api/batches | JSON `{ batches: [...], total }` | [ ] |

> ถ้า **ยังไม่ login** แล้ว API ตอบ JSON ได้ → บันทึกเป็น **FAIL auth gate** ใน Notes

---

## 6) Batch workflow (optional แต่แนะนำ)

| # | ขั้นตอน | ผลที่คาดหวัง | Pass |
|---|---------|--------------|------|
| 6.1 | ไป `/batches/new` → สร้างชุดใหม่ (draft) | redirect ไป `/batches/[id]` สถานะ **draft** | [ ] |
| 6.2 | ในหน้า batch → เลือกไฟล์ `import-sample-seed.xlsx` | เลือกไฟล์ได้ | [ ] |
| 6.3 | กด **Preview** | แสดง "พร้อม 2" (หรือใกล้เคียง) | [ ] |
| 6.4 | กด **นำเข้าคำสั่งที่พร้อม** | ตารางมี **2 แถว** | [ ] |
| 6.5 | กด **Preview** (batch) | สถานะ → **previewed** | [ ] |
| 6.6 | กด **Approve All** | สถานะ → **approved**, คำสั่งเป็น **active** | [ ] |

> ถ้า import ล้ม: มักเป็น **ไม่มี seed persons** ใน DB prod — รัน seed หรือสร้าง employee ที่ match ไฟล์ตัวอย่างก่อน

---

## 7) Cron (optional)

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://salary-detech.vercel.app/api/cron/cleanup-previews
```

| ผล HTTP | ความหมาย | Pass |
|---------|----------|------|
| `200` | cron + `CRON_SECRET` ถูกต้อง | [ ] |
| `401` | `CRON_SECRET` ไม่ตรงหรือไม่ได้ตั้ง | [ ] |

---

## 8) Logout (ถ้ามีปุ่ม logout ใน nav)

- [ ] Logout แล้วเข้า `/dashboard` อีกครั้ง → redirect ไป `/login`

---

## สรุปผล

| หมวด | Pass | Fail | N/A |
|------|------|------|-----|
| 1–2 Auth | /4 | | |
| 3–4 Pages | /7 | | |
| 5 API | /2 | | |
| 6 Batch | /6 | | |
| 7 Cron | /1 | | |

**Overall:** [ ] PASS  [ ] FAIL

**Notes / bugs:**

```
(วาง error message, screenshot link, หรือ URL ที่ fail)
```

---

## Quick copy — URLs ทั้งหมด

```
https://salary-detech.vercel.app/login
https://salary-detech.vercel.app/dashboard
https://salary-detech.vercel.app/batches
https://salary-detech.vercel.app/batches/new
https://salary-detech.vercel.app/orders
https://salary-detech.vercel.app/employees
https://salary-detech.vercel.app/reports/stale
https://salary-detech.vercel.app/api/dashboard/summary
https://salary-detech.vercel.app/api/batches
```

---

See also: [DEPLOY.md](./DEPLOY.md) · [RUNBOOK.md](./RUNBOOK.md)
