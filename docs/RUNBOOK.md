# Runbook — Salary Detech System
## คู่มือสำหรับผู้ดูแลระบบ

---

## 🔐 การเข้าสู่ระบบ

1. เปิด URL ที่ได้รับจากทีม IT
2. เข้าสู่ระบบด้วย username/password ที่ได้รับ
3. หากเข้าไม่ได้ ให้ติดต่อทีม IT เพื่อ reset password

---

## 📊 แผงควบคุม (Dashboard)

- **คำสั่งทั้งหมด**: จำนวนคำสั่งทั้งหมดในระบบ
- **Active**: คำสั่งที่ยังมีผลบังคับใช้
- **ต้องแก้ไข** ⚠️: คำสั่งที่ข้อมูลไม่ตรงกับความเป็นจริง — **ต้องดำเนินการแก้ไข**
- **ชุดคำสั่ง**: กลุ่มคำสั่งที่นำเข้าพร้อมกัน
- **รอดำเนินการ**: ชุดคำสั่งที่ยังไม่ได้อนุมัติ

---

## 📋 การใช้งานทั่วไป

### ดูรายชื่อข้าราชการ
- เมนู **👥 ข้าราชการ** → ค้นหาด้วยชื่อ/สกุล
- คลิกชื่อเพื่อดูรายละเอียดและประวัติคำสั่ง

### ดูคำสั่ง
- เมนู **📋 คำสั่ง** → กรองตามประเภท/สถานะ
- คลิกเลขคำสั่งเพื่อดูรายละเอียด

### ดูรายงาน
- เมนู **📜 Audit** → ดูประวัติการเปลี่ยนแปลงทั้งหมด

---

## ⚠️ สิ่งที่ต้องทำเมื่อมี "คำสั่งที่ต้องแก้ไข"

1. ไปที่ Dashboard → คลิก **ต้องแก้ไข**
2. ตรวจสอบรายการที่มีปัญหา (สีแดง)
3. แต่ละรายการจะบ่งบอกว่าปัญหาอยู่ที่:
   - 💰 เงินเดือน
   - 📊 ระดับ
   - 📋 ตำแหน่ง
   - 🏷️ ประเภท
   - 🏢 สังกัด
4. สร้างคำสั่งใหม่เพื่อแก้ไขข้อมูลให้ถูกต้อง

---

## 🔧 การดูแลระบบ (IT)

### Environment Variables ที่ต้องตั้งใน Vercel

| Variable | คำอธิบาย | วิธีสร้าง |
|----------|---------|----------|
| `DATABASE_URL` | Prisma CLI (CI only) | ใช้ Turso URL |
| `TURSO_DATABASE_URL` | Runtime DB connection | ได้จาก turso.tech dashboard |
| `TURSO_AUTH_TOKEN` | DB auth token | ได้จาก turso.tech dashboard |
| `AUTH_SECRET` | JWT signing key | `openssl rand -base64 32` |
| `ADMIN_USERNAME` | Login username | กำหนดเอง |
| `ADMIN_PASSWORD` | Login password | กำหนดเอง (ห้าม hardcode) |
| `CRON_SECRET` | Protect cron endpoints | `openssl rand -base64 32` |
| `SENTRY_DSN` | Error tracking | ได้จาก sentry.io |
| `NODE_VERSION` | Node.js version | `20` |

### การ Deploy

1. Push โค้ดขึ้น `main` branch
2. Vercel จะ build + deploy อัตโนมัติ
3. ตรวจสอบ build log ที่ Vercel dashboard
4. ทดสอบ login หลัง deploy

### การ Backup

- Turso มี automatic backup อยู่แล้ว
- สามารถ export ข้อมูลได้จาก turso.tech dashboard

### Cron Jobs

- **cleanup-previews**: ทำงานทุกวัน 02:00 UTC
  - ลบ preview orders ที่หมดอายุ (>24 ชม.)
  - Protected by CRON_SECRET

---

## 📞 ติดต่อ

- **Repository**: github.com/Arnutt-N/salary-detech
- **ปัญหาเร่งด่วน**: ติดต่อทีม IT
