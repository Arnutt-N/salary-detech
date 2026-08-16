/**
 * Master Data Constants and Lookups from DPIS Government HR Database (192 Tables Schema)
 * Source: secrets/schema/00-all-tables.fixed.sql & Data Dictionary.fixed.md
 */

// ─── 1. ระดับตำแหน่งมาตรฐาน ก.พ. (PER_LEVEL - 11 ระดับตำแหน่งหลัก) ───
export const DPIS_POSITION_LEVELS = [
  { levelNo: "O1", name: "ปฏิบัติงาน", type: "ทั่วไป", shortName: "ปง." },
  { levelNo: "O2", name: "ชำนาญงาน", type: "ทั่วไป", shortName: "ชง." },
  { levelNo: "O3", name: "อาวุโส", type: "ทั่วไป", shortName: "อส." },
  { levelNo: "O4", name: "ทักษะพิเศษ", type: "ทั่วไป", shortName: "ทศ." },
  { levelNo: "K1", name: "ปฏิบัติการ", type: "วิชาการ", shortName: "ปก." },
  { levelNo: "K2", name: "ชำนาญการ", type: "วิชาการ", shortName: "ชก." },
  { levelNo: "K3", name: "ชำนาญการพิเศษ", type: "วิชาการ", shortName: "ชพ." },
  { levelNo: "K4", name: "เชี่ยวชาญ", type: "วิชาการ", shortName: "ชช." },
  { levelNo: "K5", name: "ทรงคุณวุฒิ", type: "วิชาการ", shortName: "ทว." },
  { levelNo: "M1", name: "อำนวยการต้น", type: "อำนวยการ", shortName: "อต." },
  { levelNo: "M2", name: "อำนวยการสูง", type: "อำนวยการ", shortName: "อส." },
  { levelNo: "E1", name: "บริหารต้น", type: "บริหาร", shortName: "บต." },
  { levelNo: "E2", name: "บริหารสูง", type: "บริหาร", shortName: "บส." },
] as const

// ─── 2. รหัสการเคลื่อนไหวมาตรฐาน (PER_MOVMENT -> orderType Mapping) ───
export const DPIS_MOVEMENT_MAP: Record<string, { orderType: string; label: string; isMovement: boolean }> = {
  // บรรจุ / แต่งตั้ง
  "10100": { orderType: "appointment", label: "บรรจุเข้ารับราชการ", isMovement: true },
  "10110": { orderType: "appointment", label: "บรรจุกลับเข้ารับราชการ", isMovement: true },
  "10200": { orderType: "appointment", label: "แต่งตั้งให้ดำรงตำแหน่ง", isMovement: true },

  // เลื่อนเงินเดือน / เงินเดือน
  "20100": { orderType: "salary_increase", label: "เลื่อนขั้นเงินเดือนปกติ", isMovement: false },
  "20110": { orderType: "salary_apr", label: "เลื่อนเงินเดือน 1 เม.ย.", isMovement: false },
  "20120": { orderType: "salary_oct", label: "เลื่อนเงินเดือน 1 ต.ค.", isMovement: false },
  "20200": { orderType: "special_salary", label: "เลื่อนขั้นเงินเดือนกรณีพิเศษ", isMovement: false },
  "20300": { orderType: "salary_qualification", label: "ได้รับเงินเดือนตามคุณวุฒิ", isMovement: false },
  "20400": { orderType: "salary_cap_adjustment", label: "ปรับอัตราเงินเดือนตามมติ ครม. (1 พ.ค.)", isMovement: false },
  "20500": { orderType: "salary_entitlement", label: "ให้ได้รับเงินเดือน", isMovement: true },

  // เลื่อนระดับ / ย้าย / โอน
  "30100": { orderType: "promotion", label: "เลื่อนระดับตำแหน่ง", isMovement: true },
  "30200": { orderType: "transfer", label: "ย้ายภายในส่วนราชการ", isMovement: true },
  "30300": { orderType: "transfer_in", label: "รับโอนจากต่างส่วนราชการ", isMovement: true },
  "30400": { orderType: "transfer_out", label: "โอนไปต่างส่วนราชการ", isMovement: true },
  "30500": { orderType: "assign_transfer", label: "ให้โอน", isMovement: true },

  // พ้นจากราชการ
  "40100": { orderType: "resign", label: "ลาออกจากราชการ", isMovement: true },
  "40200": { orderType: "retire", label: "เกษียณอายุราชการ", isMovement: true },
  "40300": { orderType: "resign", label: "ให้ออกจากราชการ", isMovement: true },
}

// ─── 3. ประเภทข้าราชการ (PER_OFF_TYPE) ───
export const DPIS_OFFICER_TYPES = [
  { code: "1", label: "ข้าราชการพลเรือนสามัญ" },
  { code: "2", label: "ลูกจ้างประจำ" },
  { code: "3", label: "พนักงานราชการ" },
  { code: "4", label: "ลูกจ้างชั่วคราว" },
] as const

/**
 * Helper: แปลงรหัส mov_code ของ DPIS เป็น orderType ของ Salary Detech
 */
export function resolveOrderTypeFromDpisMovCode(movCode: string | null | undefined): string {
  if (!movCode) return "other"
  const mapped = DPIS_MOVEMENT_MAP[movCode]
  if (mapped) return mapped.orderType

  // Fallback pattern matching
  if (movCode.startsWith("20")) return "salary_increase"
  if (movCode.startsWith("301")) return "promotion"
  if (movCode.startsWith("30")) return "transfer"
  if (movCode.startsWith("40")) return "resign"
  if (movCode.startsWith("10")) return "appointment"

  return "other"
}

/**
 * Helper: ค้นหาระดับตำแหน่งจาก levelNo หรือ ชื่อระดับ
 */
export function resolvePositionLevel(levelInput: string | null | undefined): string | null {
  if (!levelInput) return null
  const clean = levelInput.trim()
  const found = DPIS_POSITION_LEVELS.find(
    (l) => l.levelNo.toLowerCase() === clean.toLowerCase() || l.name === clean || l.shortName === clean
  )
  return found ? found.name : clean
}
