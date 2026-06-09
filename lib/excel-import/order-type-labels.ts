import type { OrderType } from "@/lib/order-types"

/** Map ประเภทคำสั่ง (Thai label in Excel) → order_type */
const THAI_ORDER_TYPE_MAP: Record<string, OrderType> = {
  เลื่อนระดับ: "promotion",
  เลื่อนตำแหน่ง: "promotion",
  แต่งตั้ง: "appointment",
  ย้าย: "transfer",
  รับโอน: "transfer_in",
  โอน: "transfer_out",
  โอนออก: "transfer_out",
  ให้โอน: "assign_transfer",
  ลาออก: "resign",
  เกษียณ: "retire",
  ให้ได้รับเงินเดือน: "salary_entitlement",
  เลื่อนเงินเดือน: "salary_increase",
  เลื่อนเงินเดือนกรณีพิเศษ: "special_salary",
  เลื่อนพิเศษ: "special_salary",
  ปรับวุฒิ: "education_adjust",
  ปรับวุฒิการศึกษา: "education_adjust",
  เงินเดือนตามคุณวุฒิ: "salary_qualification",
  ให้ได้รับเงินเดือนตามคุณวุฒิ: "salary_qualification",
  ปรับอัตรา: "salary_cap_adjustment",
  "เลื่อน 1 เม.ย.": "salary_apr",
  "เลื่อน 1 ต.ค.": "salary_oct",
}

export function resolveOrderTypeFromLabel(
  label: unknown,
  sheetDefault?: OrderType
): OrderType | null {
  const text = String(label ?? "").trim()
  if (!text && sheetDefault) return sheetDefault
  if (!text) return null

  const direct = THAI_ORDER_TYPE_MAP[text]
  if (direct) return direct

  return null
}
