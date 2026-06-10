---
name: Salary Detech
description: ระบบตรวจสอบคำสั่งข้าราชการ — warm, clear, Thai-first internal HR tool
colors:
  page-bg: "#f9fafb"
  surface: "#ffffff"
  ink: "#18181b"
  ink-muted: "#71717a"
  ink-subtle: "#a1a1aa"
  border: "#e4e4e7"
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  alert: "#dc2626"
  alert-surface: "#fef2f2"
  alert-border: "#fecaca"
  success: "#16a34a"
  nav-active: "#18181b"
typography:
  display:
    fontFamily: "'Noto Sans Thai', 'Noto Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "'Noto Sans Thai', 'Noto Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "'Noto Sans Thai', 'Noto Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Noto Sans Thai', 'Noto Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  md: "8px"
  lg: "12px"
  xl: "12px"
spacing:
  page: "24px"
  card: "16px"
  nav-height: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  kpi-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  kpi-card-alert:
    backgroundColor: "{colors.alert-surface}"
    textColor: "{colors.alert}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Salary Detech

## 1. Overview

**Creative North Star: "The Trusted Clerk's Desk"**

Salary Detech ควรรู้สึกเหมือนโต๊ะทำงานของเจ้าหน้าที่ HR ที่เป็นระเบียบ อบอุ่น และช่วยให้มั่นใจ: ข้อมูลอ่านง่าย ลิงก์ไปแก้ปัญหาได้ทันที ไม่มี visual noise ที่ทำให้กลัวกดผิด ระบบเป็น product register ชัดเจน (dashboard, ตาราง, CRUD) ไม่ใช่ marketing page

Layout แคบ (`max-w-5xl`) เน้นอ่านและทำงาน ไม่ใช่โชว์ hero หรือ card grid ซ้ำ ๆ สีใช้เพื่อความหมาย (primary = action, alert = stale, success = export) ไม่ใช่ตกแต่ง

**Key Characteristics:**
- Thai-first copy และวันที่ พ.ศ. ผ่าน `toThaiDate`
- Zinc neutral base + semantic accent (blue action, red stale)
- White surfaces บน gray-50 page bg, elevation น้อย (shadow-sm)
- Sticky top nav สูง 48px, active link ชัด
- Tables และ forms เป็นหัวใจ ไม่ใช่ marketing cards

## 2. Colors

โทน neutral-zinc เป็นฐาน สี semantic ใช้เฉพาะ action และ alert

### Primary
- **Action Blue** (#2563eb / blue-600): ปุ่มหลัก, ลิงก์ไปรายละเอียด, CTA ที่ต้องการให้กด (จัดการ batch, ดูรายงาน)
- **Action Blue Hover** (#1d4ed8 / blue-700): hover state ของ primary actions

### Neutral
- **Page Mist** (#f9fafb / gray-50): พื้นหลัง body (`min-h-screen bg-gray-50`)
- **Surface White** (#ffffff): cards, tables, nav, form panels
- **Ink** (#18181b / zinc-900): headings, KPI numbers, nav brand, primary button (login)
- **Ink Muted** (#71717a / zinc-500): secondary labels, table meta, KPI subtitles
- **Ink Subtle** (#a1a1aa / zinc-400): empty states, placeholders
- **Border Zinc** (#e4e4e7 / zinc-200): card borders, table dividers, nav bottom border

### Tertiary (semantic accents)
- **Alert Red** (#dc2626 / red-600): stale counts, ปุ่ม "ต้องแก้ไข", alert KPI value
- **Alert Surface** (#fef2f2 / red-50 + #fecaca border): KPI card เมื่อ stale > 0
- **Success Green** (#16a34a / green-600): export CSV, positive confirmations

### Named Rules
**The Semantic Color Rule.** สีนอก zinc palette ต้องมีความหมาย (action / danger / success) ห้ามใช้ gradient หรือ accent ตกแต่ง

## 3. Typography

**Display Font:** Noto Sans Thai (with Noto Sans, ui-sans-serif fallback)
**Body Font:** Noto Sans Thai (same stack — single-family system)

**Character:** อ่านง่าย เป็นทางการพอสำหรับหน่วยงานราชการ ไม่ cold เกินไป เพราะ copy เป็น supportive Thai

### Hierarchy
- **Display** (700, 1.5rem / text-2xl): หัวหน้าหน้า (`📊 แผงควบคุม`, `👥 ข้าราชการ`)
- **Title** (700, 1.125rem / text-lg): section headings (`🕐 กิจกรรมล่าสุด`)
- **Body** (400, 0.875rem / text-sm): table cells, form copy, nav links — max ~65–75ch ใน prose blocks
- **Label** (500, 0.75rem / text-xs, zinc-500): form field labels (`เงินเดือน`, `วันที่มีผล`)

### Named Rules
**The Thai Date Rule.** วันที่ธุรกิจแสดงด้วย `toThaiDate` (พ.ศ.) เสมอ; system timestamps ใช้ `toLocaleDateString("th-TH")`

## 4. Elevation

ระบบใช้ tonal layering มากกว่า shadow หนัก: white surface บน gray-50 page แยกชั้นด้วย border 1px และ shadow-sm เบา ๆ

### Shadow Vocabulary
- **Resting surface** (`shadow-sm`): cards, login panel, data tables
- **Hover lift** (`hover:shadow-md`): KPI cards ที่คลิกได้
- **No deep shadows:** ห้าม shadow-lg/xl ที่ให้ความรู้สึก SaaS marketing

### Named Rules
**The Flat-By-Default Rule.** พื้นผิว flat ที่ rest; shadow เพิ่มเฉพาะ hover หรือ panel ที่ต้องการแยกจาก page bg

## 5. Components

### Buttons
- **Shape:** gently rounded (8px / rounded-lg)
- **Primary:** blue-600 bg, white text, px-4 py-2, text-sm — ใช้กับ action หลัก (สร้าง, จัดการ batch)
- **Secondary:** white bg + border, zinc text — cancel / back
- **Destructive / Alert:** red-600 bg — stale actions
- **Login primary:** gray-900 bg (auth surface แยกจาก app chrome)

### Cards / Containers
- **KPI Card:** rounded-xl, p-4, shadow-sm, border; alert variant = red-50 bg + red-200 border
- **Form Panel:** bg-white rounded-xl p-6 shadow-sm border
- **Table Container:** bg-white rounded-lg shadow overflow-hidden; thead bg-zinc-50 border-b

### Inputs / Fields
- **Style:** rounded-lg border border-gray-300, px-3 py-2 text-sm
- **Focus:** border-gray-500 + ring-2 ring-gray-500/20
- **Error:** red-50 bg, red-600 text (login errors)

### Navigation
- **MainNav:** sticky top, white bg, border-b, h-12, max-w-5xl centered
- **Brand:** font-bold zinc-900 → `/dashboard`
- **Links:** text-sm; active = zinc-900 font-medium; inactive = zinc-600 hover zinc-900
- **Hidden on `/login`**

### Data Table (shared)
- **Header:** bg-zinc-50, text-sm font-medium, p-3, sortable hover bg-zinc-100
- **Rows:** border-b, hover:bg-zinc-50, text-sm
- **Empty:** centered zinc-400 text

### Status / Freshness (domain-specific)
- Stale badges และ freshness flags ใช้ semantic red/amber ตาม `lib/freshness.ts` — ไม่ invent สีใหม่นอก palette

## 6. Do's and Don'ts

### Do:
- **Do** ใช้ `max-w-5xl mx-auto p-6` เป็น page shell มาตรฐาน
- **Do** ลิงก์จาก KPI/table rows ไป order/employee detail โดยตรง
- **Do** ใช้ Sonner toast สำหรับ feedback หลัง mutation (ไม่ใช้ alert())
- **Do** ใช้ shared labels จาก `lib/order-types.ts` และ stale logic จาก `lib/freshness.ts`
- **Do** รักษา contrast ≥4.5:1 สำหรับ body text บน white/gray-50

### Don't:
- **Don't** ใช้ SaaS marketing template (gradient hero, identical card grids, buzzwords)
- **Don't** ทำตารางแน่นหรือตัวอักษรเล็กจนอ่านยาก — ข้อมูลท่วม
- **Don't** ใช้ side-stripe borders, gradient text, glassmorphism ตกแต่ง
- **Don't** ใส่ eyebrow labels ทุก section (01 · About pattern)
- **Don't** ปน EN/TH โดยไม่จำเป็น (ยกเว้นสถานะที่ tests ยัง assert ค่าอังกฤษ)
- **Don't** ใช้ animation ที่ไม่มี reduced-motion fallback
