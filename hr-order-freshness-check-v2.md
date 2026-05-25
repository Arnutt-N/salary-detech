# ระบบตรวจสอบความถูกต้องของข้อมูลในคำสั่ง (HR Order Freshness Check)

> หลักการกลาง: **"ข้อมูลใดๆ ในคำสั่งที่ snapshot ไว้ ≠ ข้อเท็จจริงที่ควรเป็น ณ effective_date ของคำสั่งนั้น → ต้องแก้ไข"**

---

## 1. ปัญหาที่ระบบต้องแก้

มีการออกคำสั่งที่เกี่ยวข้องกับข้าราชการหลายประเภท เช่น เลื่อนเงินเดือน เลื่อนตำแหน่ง แต่งตั้ง ย้าย โอน ลาออก ซึ่งออกคนละเวลา แต่มีผล (effective_date) ที่อาจย้อนหลัง หรือล้ำหน้ากัน ทำให้ข้อมูลในคำสั่งที่ออกก่อน (เช่น เงินเดือน ตำแหน่ง ระดับ สังกัด) ไม่ตรงกับข้อเท็จจริงที่เกิดขึ้นภายหลัง → **ต้องมีระบบตรวจสอบและแจ้งเตือนว่าคำสั่งใดต้องแก้ไข**

**สมมาตรทั้งสองทาง:** คำสั่งเลื่อนเงินเดือนมากระทบคำสั่งย้าย/โอน/ลาออก และคำสั่งย้าย/โอน/ลาออก/เลื่อนตำแหน่งที่ออกทีหลังก็กระทบคำสั่งเลื่อนเงินเดือน 1 เม.ย./1 ต.ค. เช่นกัน

---

## 2. ประเภทคำสั่งในระบบ

| ประเภท | กลุ่ม |
|---|---|
| เลื่อนเงินเดือน (1 เม.ย./1 ต.ค./กรณีพิเศษ) | การเคลื่อนไหวเงินเดือน |
| เลื่อนระดับตำแหน่ง | การเคลื่อนไหวตำแหน่ง |
| แต่งตั้ง | การเคลื่อนไหวตำแหน่ง |
| ย้าย | การเคลื่อนไหวตำแหน่ง |
| โอน / รับโอน / ให้โอน | การเคลื่อนไหวตำแหน่ง |
| ลาออก | การเคลื่อนไหวตำแหน่ง |
| ปรับวุฒิการศึกษา | การเคลื่อนไหวเงินเดือน |
| แก้ไขคำสั่ง (correction) | ทั้งสองกลุ่ม |
| ค่าตอบแทนพิเศษ → เลื่อนเงินเดือน (S5) | การเคลื่อนไหวเงินเดือน |

---

## 3. ฟิลด์ที่ต้องตรวจสอบความถูกต้อง (Freshness)

| กลุ่ม | ฟิลด์ | Status Flag | เปลี่ยนได้จากคำสั่งประเภท |
|---|---|---|---|
| เงินเดือน | `salary`, `salary_as_of_date` | `status_salary` | เลื่อนเงินเดือน, เลื่อนตำแหน่ง, ปรับวุฒิ, ปรับอัตราทั่วประเทศ, ค่าตอบแทนพิเศษ → เลื่อนเงินเดือน |
| ชื่อตำแหน่ง | `position_name` | `status_position` | เลื่อนตำแหน่ง, ย้าย, โอน, แต่งตั้ง |
| ประเภทตำแหน่ง | `position_type` (บริหาร/อำนวยการ/วิชาการ/ทั่วไป) | `status_type` | เลื่อนตำแหน่ง, แต่งตั้ง |
| ระดับตำแหน่ง | `position_level` (ปฏิบัติการ/ชำนาญการ/ชำนาญการพิเศษ/เชี่ยวชาญ) | `status_level` | เลื่อนระดับ |
| สังกัด | `bureau`, `division`, `department`, `ministry` | `status_org` | ย้าย, โอน, รับโอน, ให้โอน, ยุบ/ตั้งหน่วยงาน |

ทุกฟิลด์มีสถานะ: `latest` / `stale` / `corrected`

---

## 4. แหล่งที่ทำให้ข้อมูลเปลี่ยนแปลง (Sources of Change)

### 4.1 การเคลื่อนไหวเงินเดือน

| แหล่ง | ความถี่ | effective_date | ครอบคลุม |
|---|---|---|---|
| เลื่อนเงินเดือนปกติ | 2 รอบ/ปี | 1 เม.ย., 1 ต.ค. | รายบุคคล |
| เลื่อนเงินเดือนกรณีพิเศษ | เมื่อเกิด | วันใดก็ได้ | รายบุคคล |
| ปรับอัตราทั่วประเทศ | ตามประกาศ | 1 พ.ค. 2567, 1 พ.ค. 2568 | เฉพาะผู้เข้าเกณฑ์ |
| ปรับตามคุณวุฒิการศึกษา | เมื่อจบการศึกษา | วันที่สภาอนุมัติ (วันใดก็ได้) | รายบุคคล |
| ค่าตอบแทนพิเศษ → เลื่อนเงินเดือน | เมื่อเลื่อนระดับ/แต่งตั้ง/ย้าย/โอน | วันที่เกิดรายการ | รายบุคคล |

### 4.2 การเคลื่อนไหวตำแหน่ง

| แหล่ง | effective_date | ข้อมูลที่เปลี่ยน |
|---|---|---|
| เลื่อนตำแหน่ง/ระดับ | วันที่มีผลตามคำสั่ง | `position_name`, `position_type`, `position_level`, ฐานคำนวณเงินเดือน |
| แต่งตั้ง | วันที่มีผลตามคำสั่ง | `position_name`, `position_type`, `position_level` |
| ย้าย | วันที่มีผลตามคำสั่ง | `position_name`, `bureau`, `division`, `department`, `ministry` |
| โอน / รับโอน / ให้โอน | วันที่มีผลตามคำสั่ง | สังกัดทั้งหมด, อาจรวมตำแหน่ง |
| ลาออก | วันที่มีผลตามคำสั่ง | — (แต่เงินเดือนสุดท้ายก่อนลาออกต้องถูกต้อง คำสั่งหลังวันลาออกต้องเพิกถอน) |

---

## 5. Decision Algorithm

```
FUNCTION is_order_stale(order):
    
    employee = get_employee(order.employee_id)
    
    // Check 1: เงินเดือน
    max_salary_date = get_max_salary_effective_date(employee)
    IF order.salary_as_of_date IS NOT NULL 
       AND order.salary_as_of_date < max_salary_date:
        order.status_salary = 'stale'
    
    // Check 2: ระดับตำแหน่ง (กระทบฐานคำนวณเงินเดือน)
    // ⚠️ exclude คำสั่งตัวเอง: WHERE id != order.id
    current_level = get_current_level(employee, exclude_order_id=order.id)
    IF order.position_level IS NOT NULL 
       AND order.position_level ≠ current_level:
        order.status_level = 'stale'
    
    // Check 3: ชื่อตำแหน่ง
    current_position = get_current_position(employee, exclude_order_id=order.id)
    IF order.position_name IS NOT NULL 
       AND order.position_name ≠ current_position:
        order.status_position = 'stale'
    
    // Check 4: ประเภทตำแหน่ง
    current_type = get_current_position_type(employee, exclude_order_id=order.id)
    IF order.position_type IS NOT NULL 
       AND order.position_type ≠ current_type:
        order.status_type = 'stale'
    
    // Check 5: สังกัด
    current_org = get_current_org(employee, exclude_order_id=order.id)
    IF order.bureau ≠ current_org.bureau OR 
       order.division ≠ current_org.division OR
       order.department ≠ current_org.department OR
       order.ministry ≠ current_org.ministry:
        order.status_org = 'stale'
    
    // Check 6: ปรับอัตราทั่วประเทศ (dynamic — query salary_base_adjustments)
    applicable_adjustments = get_applicable_system_adjustments(employee)
    FOR EACH adj IN applicable_adjustments:
        IF order.salary_as_of_date < adj.adjust_date:
            order.status_salary = 'stale'
    
    // Overall
    order.overall_status = 'stale' IF ANY status_* = 'stale'
```

> **⚠️ ข้อควรระวัง:** `get_current_*` functions ต้อง exclude คำสั่งตัวเอง (`WHERE id != order.id`) เพื่อป้องกันการเทียบกับตัวเองแล้ว stale เสมอ

---

## 6. การหา max_salary_effective_date

```sql
CREATE VIEW latest_salary_effective_date AS
SELECT employee_id, MAX(effective_date) AS max_eff
FROM (
    -- (1) คำสั่งเลื่อนเงินเดือน (ปกติ + พิเศษ)
    SELECT employee_id, effective_date FROM orders
    WHERE order_type IN ('salary_increase', 'special_salary')
      AND order_status = 'active'
    
    UNION
    
    -- (2) คำสั่งเลื่อนตำแหน่ง/ระดับ (เปลี่ยนฐานคำนวณ)
    SELECT employee_id, effective_date FROM orders
    WHERE order_type = 'promotion' 
      AND changes_calculation_base = TRUE
      AND order_status = 'active'
    
    UNION
    
    -- (3) ปรับอัตราทั่วประเทศ (dynamic — ไม่ hardcode วันที่)
    SELECT saa.employee_id, sba.adjust_date AS effective_date
    FROM salary_adjustment_applicants saa
    JOIN salary_base_adjustments sba ON saa.adjustment_id = sba.id
    WHERE sba.is_active = TRUE
    
    UNION
    
    -- (4) ปรับตามคุณวุฒิการศึกษา (วันสภาอนุมัติ)
    SELECT employee_id, council_approval_date AS effective_date
    FROM employee_education_adjustments
    
    UNION
    
    -- (5) ค่าตอบแทนพิเศษ → เลื่อนเงินเดือน (effective ตามวันที่เลื่อนระดับ/แต่งตั้ง/ย้าย/โอน)
    SELECT employee_id, effective_date
    FROM compensation_to_salary
    
) combined
WHERE effective_date IS NOT NULL  -- ป้องกัน NULL ใน MAX()
GROUP BY employee_id;
```

> **แก้ไขจาก v2:**
> - เพิ่ม `WHERE effective_date IS NOT NULL` ป้องกัน NULL crash ใน MAX()
> - เพิ่ม `WHERE order_status = 'active'` ใน (1) และ (2)
> - (5) เปลี่ยนจาก query orders flag → ใช้ `compensation_to_salary` table (§9.6)

---

## 7. Complete Scenarios — Impact Analysis

### 7.1 กลุ่ม A: ไม่ต้องแก้ไข (ข้อมูลยังเป็นปัจจุบัน)

| # | คำสั่ง | Effective | salary_as_of | เหตุผล |
|---|---|---|---|
| A1 | ย้าย/โอน/เลื่อนระดับ/แต่งตั้ง | 15 พ.ค. 69 | 1 เม.ย. 69 | ✅ รอบเดียวกัน (ครึ่งปีแรก) |
| A2 | ย้าย/โอน/เลื่อนระดับ/แต่งตั้ง | 15 ธ.ค. 69 | 1 ต.ค. 69 | ✅ รอบเดียวกัน (ครึ่งปีหลัง) |
| A3 | ลาออก | 20 มิ.ย. 69 | 1 เม.ย. 69 | ✅ ยังไม่มีรอบใหม่เกิดหลังวันลาออก |

**Logic:** `salary_as_of_date` = 1 เม.ย. หรือ 1 ต.ค. ของ fiscal half-year นั้น และยังไม่มีเงินเดือน effective ใหม่หลังวันนั้น

---

### 7.2 กลุ่ม B: เงินเดือนเก่า — ต้องแก้ไข

| # | คำสั่งเก่า | Effective | salary_as_of | คำสั่งใหม่ที่กระทบ |
|---|---|---|---|
| B1 | ย้าย/โอน/เลื่อนระดับ/แต่งตั้ง | 20 พ.ค. 69 | 1 ต.ค. 68 ⬅️ | เลื่อนเงินเดือน 1 เม.ย. 69 |
| B2 | ย้าย/โอน/เลื่อนระดับ/แต่งตั้ง | 20 พ.ย. 69 | 1 เม.ย. 69 ⬅️ | เลื่อนเงินเดือน 1 ต.ค. 69 |
| B3 | ลาออก | 5 มิ.ย. 69 | 1 ต.ค. 68 ⬅️ | เลื่อนเงินเดือน 1 เม.ย. 69 |
| B4 | เลื่อนเงินเดือน 1 เม.ย. 69 | 1 เม.ย. 69 | — | ปรับอัตราทั่วประเทศที่มีผลย้อน (1 พ.ค. 67/68) |

---

### 7.3 กลุ่ม C: คำสั่งที่มีผลในด้านข้อมูลตำแหน่ง → มากระทบคำสั่งเงินเดือน และคำสั่งตำแหน่งอื่น ๆ

#### C1 — เลื่อนระดับ → กระทบทั้งเงินเดือนและตำแหน่งอื่น

```
#1 เลื่อนเงินเดือน 1 เม.ย. 2569    effective=1 เม.ย.  position_level=ปฏิบัติการ
#2 คำสั่งย้าย                        effective=1 พ.ค.  salary_as_of_date=1 เม.ย.

#3 เลื่อนระดับ (มาทีหลัง)
  effective=15 มี.ค. 2569 ← ก่อนทั้ง 1 เม.ย. และ 1 พ.ค.

→ #1.status_salary = 'stale' (ฐานคำนวณเปลี่ยน: ปฏิบัติการ → ชำนาญการ)
→ #2.status_position = 'stale' (ตำแหน่ง ณ 1 พ.ค. เปลี่ยน)
→ แก้ #1 → แก้ #2 ด้วย (cascade 2 ชั้น)
```

#### C2 — ย้าย/โอน → กระทบทั้งเงินเดือนและตำแหน่งอื่น

```
#1 เลื่อนเงินเดือน 1 ต.ค. 2568    effective=1 ต.ค.  bureau=กองคลัง
#2 แต่งตั้ง                           effective=15 ธ.ค.  bureau=กองคลัง (อ้างอิงจาก #1)

#3 คำสั่งย้าย (มาทีหลัง)
  effective=1 ส.ค. 2568 ← ก่อนทั้ง 1 ต.ค. และ 15 ธ.ค.
  bureau=กองพัสดุ

→ #1.status_org = 'stale' (สังกัด ณ 1 ต.ค. เปลี่ยน)
→ #2.status_org = 'stale' (สังกัด ณ 15 ธ.ค. เปลี่ยน)
→ แก้ #1 → แก้ #2 ด้วย
```

#### C3 — แต่งตั้ง → กระทบเลื่อนเงินเดือน + ตำแหน่งถัดไป

```
#1 เลื่อนระดับ effective=1 มี.ค. 2569  position_level=ชำนาญการ
#2 เลื่อนเงินเดือน 1 เม.ย. 2569  position_level=ชำนาญการ

#3 แต่งตั้ง effective=15 ก.พ. 2569 (มาทีหลัง)
  position_level=ชำนาญการพิเศษ ← ก่อนทั้ง 1 มี.ค. และ 1 เม.ย.

→ #1.status_level = 'stale' (ระดับไม่ตรง, เปลี่ยนจาก ชก. → ชกพ.)
→ #2.status_salary = 'stale' (ฐานคำนวณเปลี่ยน)
→ แก้ #1 → แก้ #2 ด้วย
```

#### C4 — รับโอน → ไม่มีประวัติเดิมในระบบ

```
#1 รับโอน effective=1 มี.ค. 2569
  salary_as_of_date = 1 ต.ค. 2568 ← เงินเดือนจากหน่วยงานเดิม (ไม่มีประวัติในระบบ)

→ ไม่มีคำสั่งเลื่อนเงินเดือนก่อนหน้าในระบบ
→ เช็คเฉพาะการปรับวุฒิการศึกษา, ปรับอัตราทั่วประเทศ, เต็มขั้น

ต่อมามี #2 เลื่อนเงินเดือน 1 เม.ย. 2569:
  → #1.salary_as_of_date (1 ต.ค. 68) < 1 เม.ย. 69
  → status_salary = 'stale'
  → ต้องแก้ไข #1
```

---

### 7.4 กลุ่ม D: ฐานคำนวณเปลี่ยน (ระดับ/ตำแหน่ง/ประเภท) — ต้องแก้ไข

| # | คำสั่งเก่า | ใช้อะไร | คำสั่งใหม่ | ผล |
|---|---|---|---|
| D1 | เลื่อนเงินเดือน 1 เม.ย. 69 | ระดับปฏิบัติการ | เลื่อนระดับเป็นชำนาญการ effective 1 มี.ค. 69 | 🔄 คำนวณใหม่ด้วยฐาน ×1.2 |
| D2 | เลื่อนเงินเดือน 1 เม.ย. 69 | ตำแหน่ง นวก. | แต่งตั้งเป็น ผอ.กลุ่ม effective 15 ก.พ. 69 | 🔄 ฐานคำนวณเปลี่ยนทั้งตำแหน่ง+ระดับ |
| D3 | เลื่อนเงินเดือน 1 ต.ค. 69 | ระดับชำนาญการ | เลื่อนเป็นชำนาญการพิเศษ effective 1 เม.ย. 69 | 🔄 กระทบทั้ง 1 เม.ย. และ 1 ต.ค. |

---

### 7.5 กลุ่ม E: สังกัด/ตำแหน่งเปลี่ยน — ต้องแก้ไข

| # | คำสั่งเก่า | คำสั่งใหม่ | ผล |
|---|---|---|---|
| E1 | ย้าย (ระบุกอง A ไว้) | โอนไปกรมอื่น effective หลัง แต่วันที่มีผลย้อนก่อน | ข้อมูลสังกัด stale |
| E2 | เลื่อนระดับ (ระบุตำแหน่ง X) | ย้าย/แต่งตั้งไปตำแหน่ง Y effective ก่อน | ชื่อตำแหน่ง stale |

---

### 7.6 กลุ่ม F: เงินเดือนเต็มขั้น + ค่าตอบแทนพิเศษ

| # | สถานการณ์ | ผล |
|---|---|---|
| F1 | เงินเดือนเต็มขั้น → ได้ค่าตอบแทนพิเศษรอบละ 6 เดือน → ระหว่างรอบนั้นเลื่อนระดับ/แต่งตั้ง/ย้าย/โอน | ✅ นำค่าตอบแทนพิเศษที่ได้รับแล้วมารวมเลื่อนเงินเดือน → effective ตั้งแต่วันที่เลื่อนระดับ/แต่งตั้ง/ย้าย/โอน |
| F2 | จาก F1 → ออกคำสั่งเลื่อนเงินเดือนกรณีพิเศษ (มีผลย้อนหลัง) | 🔄 กระทบทุกคำสั่งหลังวันที่ effective ใหม่ |
| F3 | ค่าตอบแทนพิเศษสะสมหลายรอบก่อนเลื่อนระดับ | 🔄 เงินเดือนใหม่ = เต็มขั้น + Σ(ค่าตอบแทนพิเศษที่ได้รับ) |

**ดูรายละเอียดเพิ่มเติม:** §9.6 (Compensation Tracking Schema)

#### F1 Example Timeline

```
รอบค่าตอบแทน 2026-H1: 1 เม.ย. 2569 – 30 ก.ย. 2569
  เงินเดือนเต็มขั้น = 40,000
  ค่าตอบแทนต่อเดือน = 2,000 (ทั้งรอบ = 12,000)

เดือน เม.ย. → ได้รับ 2,000
เดือน พ.ค. → ได้รับ 2,000
15 มิ.ย. → เลื่อนระดับ!

total_received = 4,000 (เม.ย. + พ.ค.)
new_salary = 40,000 + 4,000 = 44,000 ← effective 15 มิ.ย.
remaining = 8,000 → คืนระบบ (เดือน มิ.ย.–ก.ย. ไม่ได้รับค่าตอบแทนแล้ว)

หลัง 15 มิ.ย. → เงินเดือน = 44,000 (ไม่เต็มขั้นแล้ว)
1 ต.ค. → เลื่อนเงินเดือนปกติจากฐาน 44,000 ได้ตามปกติ
```

---

### 7.7 กลุ่ม G: ปรับอัตราทั่วประเทศ (เฉพาะผู้เข้าเกณฑ์)

| # | สถานการณ์ | ผล |
|---|---|---|
| G1 | ได้รับการปรับ → มีคำสั่งใดๆ effective ≥ adjust_date แต่ใช้เงินเดือนเก่า | ⚠️ stale |
| G2 | ได้รับการปรับหลายรอบ | max_eff ขยับตามแต่ละรอบ |
| G3 | ไม่เข้าเกณฑ์ปรับเลย | ไม่กระทบ |

> **สำคัญ:** การปรับอัตราทั่วประเทศ **ไม่ได้ปรับทุกคน** — ปรับเฉพาะข้าราชการที่มีคุณวุฒิตามเกณฑ์ที่กำหนด ใช้ `salary_adjustment_applicants` เช็ครายบุคคล การเพิ่มรอบใหม่ในอนาคต (เช่น 1 พ.ค. 2569) แค่ INSERT แถวใหม่ใน `salary_base_adjustments` — ไม่ต้องแก้ SQL

---

### 7.8 กลุ่ม H: Chain Reaction (Domino Effect)

| # | ลำดับเหตุการณ์ | ต้องแก้ |
|---|---|---|
| H1 | (1) คำสั่งย้ายออกก่อน → (2) เลื่อนเงินเดือน → (3) เลื่อนระดับ | แก้ทั้งย้าย + เลื่อนเงินเดือน |
| H2 | (1) เลื่อนเงินเดือน 1 เม.ย. 69 → (2) ข้อเท็จจริงเปลี่ยนตอน 1 ต.ค. 69 | แก้ 1 ต.ค. 69 → กระทบ 1 เม.ย. 69 ด้วย → แก้ทั้ง 2 ฉบับ |
| H3 | (1) ลาออก → (2) ต่อมาเงินเดือนย้อนหลัง → เงินเดือนสุดท้ายก่อนลาออกเปลี่ยน | แก้คำสั่งลาออก (กระทบสิทธิประโยชน์) |
| H4 | Cascade 3 ทอด: เลื่อนระดับ eff 1 ส.ค. → กระทบเลื่อนเงินเดือน 1 ต.ค. → กระทบเลื่อน 1 เม.ย. | จำกัด depth=10 — หยุดถ้าเจอ circular |

---

### 7.9 กลุ่ม I: Scenario เพิ่มเติมที่ต้องคำนึงถึง

| # | Scenario | ทำไมต้องคิด |
|---|---|---|
| I1 | แก้ไขคำสั่งไปแล้วรอบหนึ่ง → ต่อมามีการเปลี่ยนแปลงอีก | ต้องมี `corrected_by` chain ไม่ใช่แค่ 1 hop |
| I2 | ยกเลิกคำสั่งเลื่อนเงินเดือน (ผิดวินัย/ทุจริต) | ต้อง revert คำสั่งที่อ้างอิงเงินเดือนนั้นทั้งหมด → `order_status = 'void'` |
| I3 | ยุบ/ตั้งหน่วยงานใหม่ → สังกัดเปลี่ยนทั้งกลุ่ม | กระทบทุกคำสั่งของทุกคนในหน่วยงานนั้น |
| I4 | กรณีเสียชีวิต | ไม่ต้องมีคำสั่งเลื่อนเงินเดือนย้อนหลัง — ระบบต้องป้องกัน |
| I5 | โอนข้ามกระทรวง → ฐานเงินเดือนคนละระบบ | ต้อง snapshot ข้อมูลจากต้นสังกัดก่อนโอน + `salary_system_type` |
| I6 | ปรับตำแหน่งทั้งสายงาน (reclassification) | กระทบชื่อตำแหน่ง/ประเภท ทั้งระบบ |
| I7 | ควบรวมตำแหน่ง → คนเดียวครอง 2 ตำแหน่ง | เงินเดือนยึดตามตำแหน่งหลัก |
| I8 | คำสั่งแก้ไขคำสั่ง (แก้คำผิด/แก้ข้อมูล) | ต้อง tracked ว่าแก้จากอะไรเป็นอะไร |
| I9 | กลับเข้ารับราชการ (reinstatement) | ต้องคำนวณเงินเดือนตามอายุราชการที่ขาดหาย — แยกวิเคราะห์เป็น 2 ช่วง |
| I10 | หลายคำสั่งในวันเดียวกัน | เรียงตาม `effective_date` → `issue_date` → `created_at` — ถ้า effective_date เท่ากัน ให้ใช้ issue_date ตัดสิน |

---

### 7.10 กลุ่ม J: ปรับเงินเดือนตามคุณวุฒิการศึกษา (รายบุคคล)

| # | สถานการณ์ | ผล |
|---|---|---|
| J1 | จบปริญญาโท สภาอนุมัติ 15 มี.ค. 69 → effective 15 มี.ค. 69 | ⚠️ ทุกคำสั่งที่ salary_as_of_date < 15 มี.ค. 69 → stale |
| J2 | J1 + มีคำสั่งเลื่อนเงินเดือน 1 เม.ย. 69 (คำนวณด้วยฐานวุฒิเก่า) | 🔄 ต้องแก้ไข |
| J3 | J1 + มีคำสั่งย้าย effective 20 มี.ค. 69 (เงินเดือนเป็นฐานวุฒิเก่า) | ⚠️ stale |
| J4 | จบปริญญาเอก สภาอนุมัติ 10 ส.ค. 68 | 🔄 กระทบทุกคำสั่งตั้งแต่ 1 ต.ค. 68 เป็นต้นไป |

> **ข้อแตกต่างจากกรณี 1 พ.ค.:** effective_date เป็นวันใดก็ได้ (วันที่สภาอนุมัติ) ไม่ใช่ fixed date

---

## 8. Impact Propagation Matrix

เมื่อมีคำสั่งใหม่ออก → ต้อง re-check คำสั่งเก่าประเภทต่อไปนี้:

| คำสั่งใหม่ ↓ | ต้อง re-check คำสั่งเก่า ↓ |
|---|---|
| **เลื่อนเงินเดือน** (1 เม.ย./1 ต.ค./พิเศษ) | ทุกคำสั่งที่มี salary_as_of_date < effective_date ใหม่ + คนเดียวกัน |
| **เลื่อนระดับ/แต่งตั้ง** | คำสั่งเลื่อนเงินเดือนที่ใช้ระดับเก่า, คำสั่งย้าย/โอนที่ระบุระดับเก่า |
| **ย้าย/โอน/รับโอน/ให้โอน** | คำสั่งก่อนหน้าที่ระบุสังกัดเก่า, คำสั่งเลื่อนเงินเดือนที่คำนวณจากตำแหน่งเก่า |
| **ลาออก** | (ไม่ค่อยย้อนหลัง) แต่ถ้ามี → กระทบคำสั่งหลังวันลาออกทั้งหมด → `order_status = 'cancelled'` |
| **ปรับอัตราทั่วประเทศ** | คำสั่งที่มี salary_as_of_date < adjust_date ของคนที่เข้าเกณฑ์ |
| **ปรับวุฒิการศึกษา** (สภาอนุมัติ) | คำสั่งที่มี salary_as_of_date < council_approval_date |
| **ค่าตอบแทนพิเศษ → เลื่อนเงินเดือน** (S5) | เช่นเดียวกับเลื่อนเงินเดือน แต่ effective_date เป็นวันที่เลื่อนระดับ |
| **แก้ไขคำสั่ง (correction)** | propagate ไปทุกคำสั่งที่อ้างอิงข้อมูลที่ถูกแก้ |
| **ยุบ/ตั้งหน่วยงาน** | ทุกคำสั่งของทุกคนในหน่วยงานที่เปลี่ยน |

---

## 8.1 กฎการตัดสินใจ (Decision Rules)

### คำสั่งไหนต้องแก้ไข?

> **คำสั่งที่ (1) ออกไปแล้วก่อนที่คำสั่งย้อนหลังจะมา และ (2) มีผลตั้งแต่วันที่เท่ากับหรือหลัง effective_date ของคำสั่งย้อนหลัง และ (3) เนื้อหาของคำสั่งนั้นพึ่งพิงข้อมูลที่ถูกเปลี่ยน**

### คำสั่งไหนไม่ต้องแก้ไข?

1. `salary_as_of_date` ≥ effective_date ของทุกการเปลี่ยนแปลงเงินเดือนก่อน `issue_date`
2. ข้อมูลตำแหน่ง/ระดับ/สังกัดในคำสั่ง ตรงกับข้อเท็จจริงล่าสุด
3. Effective date ของคำสั่งเกิดก่อน effective date ของคำสั่งใหม่ (ข้อเท็จจริง ณ วันที่คำสั่งมีผล ไม่ได้รับผลกระทบ)

### การแก้ไขเป็น Cascade

- แก้คำสั่ง A → ตรวจสอบว่ามีคำสั่ง B ที่อ้างอิง A หรือไม่ → ถ้ามีและได้รับผลกระทบ → แก้ B
- จำกัดความลึกของ cascade (`max_depth=10`) เพื่อป้องกัน infinite loop
- ใช้ `corrected_from` / `corrected_by` chain + `visited` set ในการติดตาม

---

## 9. โครงสร้างฐานข้อมูล

### 9.0 ตาราง persons (หรือ employees)

```sql
CREATE TABLE persons (
    id                          SERIAL PRIMARY KEY,
    citizen_id                  VARCHAR(13),
    name_title                  VARCHAR(32),
    first_name                  VARCHAR(128),
    last_name                   VARCHAR(128),
    current_position_name       VARCHAR(256),
    current_position_type       VARCHAR(128),
    current_position_level      VARCHAR(64),
    current_bureau              VARCHAR(256),
    current_division            VARCHAR(256),
    current_department          VARCHAR(256),
    current_ministry            VARCHAR(256),
    current_salary              DECIMAL(12,2),
    salary_system_type          VARCHAR(64),     -- พลเรือน / ตำรวจ / ทหาร
    current_qualification       VARCHAR(256),
    qualification_effective_date DATE,
    is_active                   BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> **หมายเหตุ:** ฟิลด์ `adj_2024_05` / `adj_2025_05` ย้ายไปอยู่ใน `salary_adjustment_applicants` (§9.2) เพื่อรองรับการเพิ่มรอบใหม่ในอนาคตโดยไม่ต้อง ALTER TABLE

---

### 9.1 ตารางหลัก — orders

```sql
CREATE TABLE orders (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    employee_id       INT NOT NULL,
    batch_id          INT NULL,              -- FK → order_batches.id (§9.8)
    order_type        VARCHAR(50),           -- salary_increase / promotion / transfer / secondment / resign / education_adjust / salary_cap_adjustment ...
    order_no          VARCHAR(50),
    issue_date        DATE,                  -- วันที่ลงคำสั่ง
    effective_date    DATE,                  -- วันที่มีผล

    -- 📸 Data Snapshot
    salary            DECIMAL(10,2),
    salary_as_of_date DATE,                  -- เงินเดือนในคำสั่งนี้เป็นของ ณ วันไหน

    position_name     VARCHAR(200),
    position_type     VARCHAR(100),          -- บริหาร / อำนวยการ / วิชาการ / ทั่วไป
    position_level    VARCHAR(100),          -- ปฏิบัติการ / ชำนาญการ / ชำนาญการพิเศษ / เชี่ยวชาญ
    bureau            VARCHAR(200),
    division          VARCHAR(200),
    department        VARCHAR(200),
    ministry          VARCHAR(200),

    -- 🏷️ Salary System
    salary_system_type      VARCHAR(64),         -- พลเรือน / ตำรวจ / ทหาร

    -- 🔍 Freshness Status
    status_salary     ENUM('latest','stale','corrected') DEFAULT 'latest',
    status_position   ENUM('latest','stale','corrected') DEFAULT 'latest',
    status_type       ENUM('latest','stale','corrected') DEFAULT 'latest',
    status_level      ENUM('latest','stale','corrected') DEFAULT 'latest',
    status_org        ENUM('latest','stale','corrected') DEFAULT 'latest',

    -- 🔗 Correction Chain
    corrected_by      INT NULL,               -- FK → orders.id (คำสั่งที่มาแทน)
    corrected_from    INT NULL,               -- FK → orders.id (คำสั่งเดิมที่ถูกแทน)

    -- 📌 Order Lifecycle (P0)
    order_status      ENUM('draft','preview','active','cancelled','superseded','void') DEFAULT 'draft',
    status_changed_at TIMESTAMP,
    status_changed_by VARCHAR(100),
    preview_expires_at TIMESTAMP,

    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Validation
    CONSTRAINT chk_salary_as_of CHECK (salary_as_of_date IS NULL OR salary_as_of_date <= effective_date)
);
```

> **Lifecycle State Machine:**
> ```
>                     ┌─────────┐
>                     │  draft  │
>                     └────┬────┘
>                          │ preview
>                     ┌────▼────┐
>                     │ preview │──────────────┐ (expired 24h / user cancel)
>                     └────┬────┘              │
>                          │ approve           │
>                     ┌────▼────┐         ┌────┴────┐
>                     │ active  │         │ deleted │
>                     └────┬────┘         └─────────┘
>               ┌──────────┼──────────┐
>               │          │          │
>          corrected   cancelled    void
>               │          │          │
>               ▼          ▼          ▼
>         superseded  cancelled     void
> ```

| Status | ความหมาย | ใช้เมื่อ |
|--------|----------|---------|
| `draft` | กำลังร่าง — ยังไม่ออก | พิมพ์คำสั่ง, ตรวจทาน |
| `preview` | จำลองผลกระทบ — ยังไม่มีผลจริง | Preview API รัน → แสดงผล → รอ approve |
| `active` | มีผลบังคับใช้แล้ว | ลงนามคำสั่งแล้ว → propagate impact |
| `cancelled` | เพิกถอนคำสั่งนี้ | P7 มาทีหลัง → คำสั่งหลังวันลาออกต้องยกเลิก |
| `superseded` | ถูกแทนที่ด้วยคำสั่งใหม่ | corrected_by ชี้มาที่นี่ |
| `void` | โมฆะตั้งแต่แรก | ผิดวินัย/ทุจริต/ออกโดยไม่มีอำนาจ |

---

### 9.2 ตารางปรับอัตราทั่วประเทศ

```sql
CREATE TABLE salary_base_adjustments (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    adjust_date   DATE NOT NULL,            -- 1 พ.ค. 2567, 1 พ.ค. 2568, ...
    description   VARCHAR(200),
    multiplier    DECIMAL(5,4),
    is_active     BOOLEAN DEFAULT TRUE
);

-- Seed data
INSERT INTO salary_base_adjustments (adjust_date, description, multiplier) VALUES
('2024-05-01', 'ปรับอัตราเงินเดือน ขรก. 1 พ.ค. 2567', 1.05),
('2025-05-01', 'ปรับอัตราเงินเดือน ขรก. 1 พ.ค. 2568', 1.08);

CREATE TABLE salary_adjustment_applicants (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    adjustment_id   INT NOT NULL,           -- FK → salary_base_adjustments
    employee_id     INT NOT NULL,
    old_salary      DECIMAL(10,2),
    new_salary      DECIMAL(10,2),
    UNIQUE (adjustment_id, employee_id)
);
```

> **ข้อดี:** เพิ่มรอบใหม่ (1 พ.ค. 2569, ...) ก็แค่ INSERT แถวใหม่ — ไม่ต้อง ALTER TABLE, ไม่ต้องแก้ SQL, ไม่ต้อง hardcode วันที่

---

### 9.3 ตารางปรับวุฒิการศึกษา

```sql
CREATE TABLE employee_education_adjustments (
    id                      INT PRIMARY KEY AUTO_INCREMENT,
    employee_id             INT NOT NULL,
    old_education           VARCHAR(100),
    new_education           VARCHAR(100),
    council_approval_date   DATE NOT NULL,     -- วันที่สภาอนุมัติ (= effective_date)
    order_id                INT NULL,          -- FK → orders.id
    old_salary              DECIMAL(10,2),
    new_salary              DECIMAL(10,2),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 9.4 ตารางบันทึกการเปลี่ยนแปลง (Change Log)

```sql
CREATE TABLE employee_change_log (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    employee_id     INT NOT NULL,
    change_type     VARCHAR(50),               -- salary / position / level / org / education / compensation
    effective_date  DATE,
    order_id        INT,                       -- FK → orders.id
    old_value       JSON,
    new_value       JSON,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 9.5 View — ข้อมูล current state ของแต่ละคน

```sql
CREATE VIEW employee_current_state AS
SELECT 
    e.employee_id,

    -- เงินเดือนล่าสุด (รวม S5)
    (SELECT MAX(effective_date) FROM (
        SELECT effective_date FROM orders 
        WHERE employee_id = e.employee_id 
          AND order_type IN ('salary_increase','special_salary')
          AND order_status = 'active'
        UNION
        SELECT effective_date FROM orders 
        WHERE employee_id = e.employee_id 
          AND order_type = 'promotion' AND changes_calculation_base = TRUE
          AND order_status = 'active'
        UNION
        SELECT sba.adjust_date FROM salary_adjustment_applicants saa 
        JOIN salary_base_adjustments sba ON saa.adjustment_id = sba.id 
        WHERE saa.employee_id = e.employee_id AND sba.is_active = TRUE
        UNION
        SELECT council_approval_date FROM employee_education_adjustments 
        WHERE employee_id = e.employee_id
        UNION
        SELECT effective_date FROM compensation_to_salary 
        WHERE employee_id = e.employee_id
    ) src WHERE effective_date IS NOT NULL
    ) AS max_salary_effective_date,

    -- ระดับล่าสุด
    (SELECT new_value->>'$.position_level' FROM employee_change_log 
     WHERE employee_id = e.employee_id AND change_type = 'level' 
     ORDER BY effective_date DESC LIMIT 1) AS current_level,

    -- ประเภทตำแหน่งล่าสุด
    (SELECT new_value->>'$.position_type' FROM employee_change_log 
     WHERE employee_id = e.employee_id AND change_type = 'position' 
     ORDER BY effective_date DESC LIMIT 1) AS current_position_type,

    -- ชื่อตำแหน่งล่าสุด
    (SELECT new_value->>'$.position_name' FROM employee_change_log 
     WHERE employee_id = e.employee_id AND change_type = 'position' 
     ORDER BY effective_date DESC LIMIT 1) AS current_position_name,

    -- สังกัดล่าสุด
    (SELECT new_value->>'$.bureau' FROM employee_change_log 
     WHERE employee_id = e.employee_id AND change_type = 'org' 
     ORDER BY effective_date DESC LIMIT 1) AS current_bureau,
    (SELECT new_value->>'$.division' FROM employee_change_log 
     WHERE employee_id = e.employee_id AND change_type = 'org' 
     ORDER BY effective_date DESC LIMIT 1) AS current_division,
    (SELECT new_value->>'$.department' FROM employee_change_log 
     WHERE employee_id = e.employee_id AND change_type = 'org' 
     ORDER BY effective_date DESC LIMIT 1) AS current_department,
    (SELECT new_value->>'$.ministry' FROM employee_change_log 
     WHERE employee_id = e.employee_id AND change_type = 'org' 
     ORDER BY effective_date DESC LIMIT 1) AS current_ministry,

    -- ปรับอัตราทั่วประเทศที่ได้รับ (dynamic)
    (SELECT COUNT(*) > 0 FROM salary_adjustment_applicants saa 
     JOIN salary_base_adjustments sba ON saa.adjustment_id = sba.id 
     WHERE saa.employee_id = e.employee_id AND sba.adjust_date = '2024-05-01') AS adjusted_2567,
    (SELECT COUNT(*) > 0 FROM salary_adjustment_applicants saa 
     JOIN salary_base_adjustments sba ON saa.adjustment_id = sba.id 
     WHERE saa.employee_id = e.employee_id AND sba.adjust_date = '2025-05-01') AS adjusted_2568

FROM employees e;
```

---

### 9.6 S5 — Compensation Tracking (เงินเดือนเต็มขั้น → ค่าตอบแทนพิเศษ → เลื่อนระดับ)

```sql
-- รอบค่าตอบแทน
CREATE TABLE compensation_rounds (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL,
    round_label     VARCHAR(20),               -- '2026-H1' (1 เม.ย.–30 ก.ย.)
    round_start     DATE NOT NULL,              -- 1 เม.ย.
    round_end       DATE NOT NULL,              -- 30 ก.ย.
    monthly_amount  DECIMAL(10,2),              -- ค่าตอบแทนต่อเดือน
    total_round     DECIMAL(10,2),              -- ทั้งรอบ (6 × monthly)
    is_at_cap       BOOLEAN DEFAULT TRUE,       -- เงินเดือนเต็มขั้นในรอบนี้?
    status          ENUM('active','exhausted','transferred') DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- การจ่ายค่าตอบแทนรายเดือน
CREATE TABLE compensation_disbursements (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    round_id            INT NOT NULL REFERENCES compensation_rounds(id),
    disbursed_for_month VARCHAR(7),             -- '2026-04', '2026-05', ...
    amount              DECIMAL(10,2),
    disbursed_at        DATE
);

-- บันทึกการนำค่าตอบแทนมาเลื่อนเงินเดือน
CREATE TABLE compensation_to_salary (
    id                      SERIAL PRIMARY KEY,
    employee_id             INT NOT NULL,
    round_id                INT NOT NULL REFERENCES compensation_rounds(id),
    promotion_order_id      INT NOT NULL REFERENCES orders(id),
    effective_date          DATE NOT NULL,       -- วันที่เลื่อนระดับ (= วันที่เงินเดือนใหม่มีผล)
    
    total_received_to_date  DECIMAL(10,2),       -- ค่าตอบแทนที่ได้รับแล้วถึง effective_date
    used_for_salary         DECIMAL(10,2),       -- ส่วนที่นำมาเลื่อนเงินเดือน
    remaining_in_round      DECIMAL(10,2),       -- คงเหลือในรอบ (คืนระบบ)
    
    old_salary              DECIMAL(10,2),       -- เงินเดือนเต็มขั้นเดิม
    new_salary              DECIMAL(10,2),       -- เงินเดือนใหม่ (เต็มขั้น + used_for_salary)
    
    note                    TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
```

#### S5 Calculation Logic

```python
def calculate_s5_salary(employee_id, promotion_order):
    """เลื่อนระดับกลางรอบค่าตอบแทน → นำค่าตอบแทนที่ได้รับแล้วมาเลื่อนเงินเดือน"""
    
    comp_round = db.query("""
        SELECT * FROM compensation_rounds
        WHERE employee_id = ? AND round_start <= ? AND round_end >= ?
          AND status = 'active' AND is_at_cap = TRUE
    """, employee_id, promotion_order.effective_date, promotion_order.effective_date)
    
    if not comp_round:
        return None
    
    total_received = db.query("""
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM compensation_disbursements
        WHERE round_id = ? AND disbursed_at <= ?
    """, comp_round.id, promotion_order.effective_date)
    
    cap_salary = get_salary_cap(employee_id, promotion_order.effective_date)
    new_salary = cap_salary + total_received
    remaining = comp_round.total_round - total_received
    
    return {
        'old_salary': cap_salary,
        'new_salary': new_salary,
        'total_received': total_received,
        'remaining_in_round': remaining
    }
```

---

### 9.7 Preview Mode (P0)

ก่อน issue คำสั่งใหม่ ระบบต้อง preview ว่าจะกระทบคำสั่งเก่ากี่ฉบับ อะไรบ้าง

#### Preview Flow

```
ผู้ใช้กด "Preview Impact"
    │
    ├── 1. INSERT คำสั่งใหม่ด้วย order_status = 'preview'
    │
    ├── 2. CALL validate_order_freshness(new_order_id)
    │       → ได้สถานะของคำสั่งตัวเอง (latest/stale per field)
    │
    ├── 3. CALL preview_impact(new_order_id)
    │       → ได้รายการคำสั่งเก่าที่จะได้รับผลกระทบ + cascade
    │
    ├── 4. Return JSON (ดู Response Schema ด้านล่าง)
    │
    ├── 5. ผู้ใช้ตัดสินใจ:
    │       ├─ [Approve] → order_status = 'active' → trigger propagate
    │       ├─ [Edit] → กลับ draft → แก้ → preview ใหม่
    │       └─ [Cancel] → DELETE preview
    │
    └── 6. Preview expires after 24h → cron cleanup
```

#### Preview API — Stored Procedure

```sql
CREATE OR REPLACE FUNCTION preview_impact(p_new_order_id INT)
RETURNS TABLE(
    affected_order_id INT,
    affected_order_type VARCHAR(50),
    reason TEXT,
    cascade_depth INT,
    action_required VARCHAR(50)  -- 'revise' / 'cancel' / 'review'
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE impact_chain AS (
        -- Layer 0: คำสั่งเก่าที่ถูกกระทบโดยตรง
        SELECT 
            o.id,
            o.order_type,
            o.effective_date,
            build_preview_reason(NEW, o) AS reason,
            0 AS depth,
            CASE 
                WHEN NEW.order_type = 'resign' AND o.order_type = 'salary_increase' 
                     AND NEW.effective_date <= o.effective_date 
                THEN 'cancel'
                ELSE 'revise'
            END AS action_req,
            o.id AS root_id
        FROM orders o, orders NEW
        WHERE NEW.id = p_new_order_id
          AND o.employee_id = NEW.employee_id
          AND o.id != NEW.id
          AND o.order_status = 'active'
          AND o.effective_date >= NEW.effective_date
          AND has_dependency(o, NEW)
        
        UNION ALL
        
        -- Layer N: cascade (max_depth=10)
        SELECT 
            o2.id,
            o2.order_type,
            o2.effective_date,
            'Cascade จากคำสั่ง #' || ic.id AS reason,
            ic.depth + 1,
            'revise',
            ic.root_id
        FROM orders o2
        JOIN impact_chain ic ON o2.employee_id = (SELECT employee_id FROM orders WHERE id = p_new_order_id)
        WHERE o2.id != ic.id
          AND o2.order_status = 'active'
          AND o2.effective_date >= ic.effective_date
          AND o2.id != p_new_order_id
          AND ic.depth < 10
          AND o2.id NOT IN (SELECT id FROM impact_chain WHERE root_id = ic.root_id)
    )
    SELECT ic.id, ic.order_type, ic.reason, ic.depth, ic.action_req
    FROM impact_chain ic
    ORDER BY ic.effective_date, ic.depth;
END;
$$ LANGUAGE plpgsql;
```

> **App Layer Responsibility:** `build_preview_reason()` และ `has_dependency()` implement ใน application layer (Python/Go) หรือเขียนเป็น PL/pgSQL function แยก

#### Preview Response Schema

```json
{
  "preview_id": "prev_20260525_001",
  "new_order": {
    "id": 123, "order_type": "salary_increase", "effective_date": "2026-04-01",
    "freshness": { "status_salary": "latest", "status_level": "stale", "status_position": "latest", "status_type": "latest", "status_org": "latest" }
  },
  "impact_summary": {
    "total_affected": 5, "by_action": { "revise": 4, "cancel": 1 }, "max_cascade_depth": 2
  },
  "affected_orders": [
    { "id": 42, "order_no": "ลน.2569/001", "order_type": "transfer", "effective_date": "2026-05-01", "reason": "เงินเดือน ณ วันที่ย้าย เปลี่ยนจาก 25,000 → 27,000", "action": "revise", "cascade_depth": 0 },
    { "id": 99, "order_no": "ลน.2568/050", "order_type": "salary_increase", "effective_date": "2026-04-01", "reason": "บุคคลลาออก effective 2026-03-20 → คำสั่งนี้ต้องเพิกถอน", "action": "cancel", "cascade_depth": 0 }
  ],
  "warnings": ["คำสั่ง #99 (active) จะถูกยกเลิก — มีผลต่อบำเหน็จบำนาญ", "Cascade สูงสุด 2 ชั้น"]
}
```

---

### 9.8 Batch Order Support (P2)

ในโลกจริง คำสั่งเลื่อนเงินเดือน 1 เม.ย./1 ต.ค. ออกเป็นชุดหลักร้อยคน

```sql
CREATE TABLE order_batches (
    id                  SERIAL PRIMARY KEY,
    batch_no            VARCHAR(50) UNIQUE,       -- 'SAL-APR-2569-001'
    batch_type          VARCHAR(50),               -- 'salary_apr' / 'salary_oct' / 'promotion' / 'transfer'
    description         TEXT,
    effective_date      DATE,
    issue_date          DATE,
    
    total_orders        INT DEFAULT 0,
    previewed_orders    INT DEFAULT 0,
    clean_orders        INT DEFAULT 0,
    affected_orders     INT DEFAULT 0,
    blocker_orders      INT DEFAULT 0,             -- ต้องเพิกถอนคำสั่งเก่า
    cascade_total       INT DEFAULT 0,
    
    status              ENUM('draft','previewing','previewed','approved','partial','cancelled') DEFAULT 'draft',
    
    previewed_at        TIMESTAMPTZ,
    approved_at         TIMESTAMPTZ,
    approved_by         VARCHAR(100),
    
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### Batch Workflow

```
สร้าง batch (draft)
    │
    ├── 1. INSERT INTO order_batches + orders ทั้งหมด (order_status='draft', batch_id=X)
    │
    ├── 2. [Preview Batch] → batch.status='previewing'
    │       └─ FOR EACH order: preview_impact(order.id) → batch.status='previewed'
    │
    ├── 3. Dashboard:
    │       Batch: SAL-APR-2569-001 | Total: 350
    │       ✅ Clean: 320 | ⚠️ Affected: 30 | 🔴 Blockers: 2
    │
    ├── 4. ผู้ใช้ตัดสินใจ:
    │       ├─ [Approve All] → clean → active | affected → active + cascade | blockers → HALT
    │       ├─ [Approve Clean Only] → 320 active, 30 ยัง draft (status='partial')
    │       └─ [Reject] → status='cancelled'
    │
    └── 5. Post-approve → cascade_revision() per affected order
```

#### Batch Dashboard View

```sql
CREATE VIEW batch_dashboard AS
SELECT 
    b.id, b.batch_no, b.batch_type, b.effective_date, b.status,
    b.total_orders, b.clean_orders, b.affected_orders, b.blocker_orders, b.cascade_total,
    CASE 
        WHEN b.blocker_orders > 0 THEN '🔴 มี blocker'
        WHEN b.affected_orders > 0 THEN '🟡 มีผลกระทบ'
        ELSE '🟢 ผ่านทั้งหมด'
    END AS health,
    b.previewed_at, b.approved_at
FROM order_batches b
ORDER BY b.created_at DESC;
```

---

### 9.9 View — Dashboard คำสั่งที่ต้องแก้ไข

```sql
CREATE VIEW stale_orders_dashboard AS
SELECT 
    o.id,
    o.order_no,
    o.order_type,
    o.employee_id,
    o.issue_date,
    o.effective_date,
    o.order_status,
    
    -- 🚦 Warnings
    CASE WHEN o.status_salary = 'stale'   THEN '⚠️ เงินเดือนไม่ล่าสุด' END AS warn_salary,
    CASE WHEN o.status_level = 'stale'    THEN '⚠️ ระดับตำแหน่งไม่ล่าสุด' END AS warn_level,
    CASE WHEN o.status_position = 'stale' THEN '⚠️ ชื่อตำแหน่งไม่ล่าสุด' END AS warn_position,
    CASE WHEN o.status_type = 'stale'     THEN '⚠️ ประเภทตำแหน่งไม่ล่าสุด' END AS warn_type,
    CASE WHEN o.status_org = 'stale'      THEN '⚠️ สังกัดไม่ล่าสุด' END AS warn_org,
    
    -- 🎯 Overall
    CASE 
        WHEN o.order_status = 'cancelled'   THEN '🚫 ถูกเพิกถอน'
        WHEN o.order_status = 'void'        THEN '⛔ โมฆะ'
        WHEN o.order_status = 'superseded'  THEN '🔄 ถูกแทนที่'
        WHEN o.status_salary = 'stale' OR o.status_level = 'stale' 
          OR o.status_position = 'stale' OR o.status_type = 'stale' 
          OR o.status_org = 'stale'
        THEN '🔴 ต้องแก้ไข'
        ELSE '🟢 ปกติ'
    END AS overall_status

FROM orders o
WHERE o.order_status IN ('active', 'superseded')
ORDER BY o.employee_id, o.effective_date DESC;
```

> **แก้ไขจาก v2:** filter เฉพาะ `active` และ `superseded` — ไม่แสดงคำสั่งที่ cancelled/void/draft/preview แล้ว

---

## 10. Workflow

### 10.1 Single Order

```
บันทึกคำสั่งใหม่
    │
    ├── 1. INSERT ลง orders (order_status = 'draft') + employee_change_log
    │
    ├── 2. [Preview] ก่อน issue จริง (§9.7)
    │       ├─ SET order_status = 'preview'
    │       ├─ CALL validate_order_freshness(new_order_id)
    │       └─ CALL preview_impact(new_order_id) → ดูรายการที่กระทบ
    │
    ├── 3. ผู้ใช้ตัดสินใจ:
    │       ├─ [Approve] → order_status = 'active' → Step 4
    │       ├─ [Edit] → กลับ draft → แก้ → preview ใหม่
    │       └─ [Cancel] → DELETE preview
    │
    ├── 4. Post-activation:
    │       ├─ SELECT คำสั่งเก่า WHERE employee_id = same AND order_status = 'active'
    │       ├─ CALL validate_order_freshness() ทุกคำสั่งเก่า
    │       ├─ SET status_* = 'stale' สำหรับคำสั่งที่ได้รับผลกระทบ
    │       └─ cascade_stale_check() → propagate
    │
    └── 5. แจ้งเตือน: "มี N คำสั่งที่ต้องแก้ไข" → stale_orders_dashboard
```

### 10.2 Batch Order (ดู §9.8)

---

## 10.3 ป้องกัน Cascade วนลูป (Infinite Loop Protection)

```python
def cascade_stale_check(order, visited=None, depth=0, max_depth=10):
    """ตรวจสอบและตั้งค่า stale แบบ cascade พร้อมป้องกัน infinite loop"""
    if visited is None:
        visited = set()

    if order.id in visited or depth > max_depth:
        return  # ป้องกันการวนลูปและจำกัดความลึก

    visited.add(order.id)

    # หาคำสั่งที่ได้รับผลกระทบจาก order นี้
    affected = find_affected_orders(order)

    for a in affected:
        a.save()  # ตั้งค่า status ที่ได้รับผลกระทบให้เป็น 'stale'
        cascade_stale_check(a, visited, depth + 1, max_depth)
```

> **หมายเหตุ:** `visited` เก็บ `order.id` ที่เคยตรวจสอบแล้วใน chain เดียวกัน หากเจอตัวเอง → หยุดทันที

---

## 11. Trigger & Stored Procedures

### 11.1 Auto-Validate on Insert

```sql
CREATE TRIGGER after_order_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    -- Validate คำสั่งใหม่
    CALL validate_order_freshness(NEW.id);
    
    -- ถ้า order_status = 'active' → propagate impact
    -- ถ้า order_status = 'preview' → รอ user approve ก่อน
    -- (implement ใน validate_order_freshness หรือแยก procedure)
    
    -- หมายเหตุ: ใน application layer ควรใช้ cascade_stale_check() 
    -- พร้อม visited set และ max_depth=10 เพื่อป้องกันการวนลูป
END;
```

### 11.2 Preview Impact (ดู §9.7)

---

## 12. สรุปเงื่อนไขหลัก

| เงื่อนไข | ความหมาย |
|---|---|
| `salary_as_of_date < max_salary_effective_date` | มีการเปลี่ยนแปลงเงินเดือนหลังวันที่อ้างอิงในคำสั่ง |
| `position_level ≠ current_level` | ระดับเปลี่ยน → ฐานคำนวณเปลี่ยน |
| `position_type ≠ current_type` | ประเภทตำแหน่งเปลี่ยน |
| `position_name ≠ current_name` | ชื่อตำแหน่งเปลี่ยน |
| `สังกัด ≠ current_org` | ย้าย/โอน → สังกัดเปลี่ยน |
| `eligible_for_adjustment AND salary_as_of_date < adjust_date` | ได้รับการปรับอัตราทั่วประเทศ แต่คำสั่งใช้เงินเดือนก่อนปรับ (dynamic — query salary_base_adjustments) |
| `salary_as_of_date < council_approval_date` | ปรับวุฒิการศึกษา (สภาอนุมัติ) แต่คำสั่งใช้ฐานวุฒิเก่า |
| `S5 effective_date > salary_as_of_date ของคำสั่งเก่า` | ค่าตอบแทนพิเศษ → เลื่อนเงินเดือน ณ วันเลื่อนระดับ → เงินเดือนเปลี่ยน |

---

## 13. ⚠️ ข้อควรระวัง (Pitfalls)

| เรื่อง | คำแนะนำ |
|-------|---------|
| `salary_as_of_date` | **คนบันทึกต้องกรอกให้ถูกต้อง** — มี validation: `salary_as_of_date ≤ effective_date` |
| ข้อมูลตำแหน่ง snapshot | เวลาบันทึกคำสั่ง ระบบควร auto-fill จาก `employee_current_state` VIEW หรือจากคำสั่งล่าสุด |
| Circular dependency | เช็ค `corrected_from` / `corrected_by` chain + `visited` set — ถ้าเจอตัวเอง → หยุด |
| Audit trail | ทุกครั้งที่แก้ไขคำสั่ง → soft-delete เดิม + insert ใหม่ + set `corrected_from` / `corrected_by` |
| ปรับอัตราทั่วประเทศ | ไม่ใช่ทุกคนได้รับ — ใช้ `salary_adjustment_applicants` เช็ครายบุคคล — เพิ่มรอบใหม่แค่ INSERT ไม่ต้องแก้ SQL |
| ปรับวุฒิการศึกษา | วันที่มีผล = วันที่สภามหาวิทยาลัยอนุมัติ — เป็นวันใดก็ได้ ไม่ใช่วันที่ตายตัว |
| ข้ามระบบอัตราเงินเดือน | ต้องมี `salary_system_type` — logic อาจต่างกันระหว่างพลเรือน/ตำรวจ/ทหาร |
| ลาออก → กลับเข้ารับราชการ | แยกวิเคราะห์เป็นคนละช่วง — คำสั่งก่อนวันลาออกไม่ต้องสนใจ `status_*` ที่เกิดหลังลาออก |
| เสียชีวิต | ระบบต้องป้องกันคำสั่งเลื่อนเงินเดือนย้อนหลัง |
| Preview expires | cron cleanup คำสั่ง `order_status = 'preview'` ที่ `preview_expires_at < NOW()` |
| position_is_latest | `get_current_*` ต้อง exclude คำสั่งตัวเอง (`WHERE id != order.id`) |
| S5 compensation รอบ | เก็บใน `compensation_rounds` + `compensation_disbursements` — ไม่ใช้ flag ใน orders |
| Batch blockers | ถ้ามีผู้ที่ต้องเพิกถอนคำสั่งเก่า → HALT batch — ไม่อนุญาต approve all |

---

*Last updated: 2026-05-25 — v3 (injected: Preview + order_status + Batch + S5 tbls + dynamic SY + Cascade protection)*
