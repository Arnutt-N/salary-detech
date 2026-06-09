/** Shared order_type labels and grouping (§2.1 hr-order-freshness-check-v2.md) */

export const ORDER_TYPE_OPTIONS = [
  { value: "salary_increase", label: "💰 เลื่อนเงินเดือน" },
  { value: "special_salary", label: "💰 เลื่อนพิเศษ" },
  { value: "salary_qualification", label: "🎓 เงินเดือนตามคุณวุฒิ" },
  { value: "salary_cap_adjustment", label: "📊 ปรับอัตรา 1 พ.ค." },
  { value: "salary_apr", label: "💰 เลื่อน 1 เม.ย." },
  { value: "salary_oct", label: "💰 เลื่อน 1 ต.ค." },
  { value: "promotion", label: "📈 เลื่อนตำแหน่ง" },
  { value: "appointment", label: "📋 แต่งตั้ง" },
  { value: "transfer", label: "🔄 ย้าย" },
  { value: "transfer_in", label: "📥 รับโอน" },
  { value: "transfer_out", label: "📤 โอนออก" },
  { value: "assign_transfer", label: "📤 ให้โอน" },
  { value: "salary_entitlement", label: "💼 ให้ได้รับเงินเดือน" },
  { value: "resign", label: "👋 ลาออก" },
  { value: "retire", label: "🏁 เกษียณ" },
  { value: "education_adjust", label: "🎓 ปรับวุฒิ" },
  { value: "other", label: "📝 อื่นๆ" },
] as const

export type OrderType = (typeof ORDER_TYPE_OPTIONS)[number]["value"]

/** Movement orders carry prior (เดิม) + new snapshot */
export const MOVEMENT_ORDER_TYPES: readonly OrderType[] = [
  "promotion",
  "appointment",
  "transfer",
  "transfer_in",
  "transfer_out",
  "assign_transfer",
  "resign",
  "salary_entitlement",
]

export function isMovementOrderType(orderType: string): boolean {
  return (MOVEMENT_ORDER_TYPES as readonly string[]).includes(orderType)
}

const TYPE_LABEL_MAP = Object.fromEntries(
  ORDER_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>

export function getOrderTypeLabel(orderType: string): string {
  return TYPE_LABEL_MAP[orderType] ?? orderType
}

export const ORDER_TYPE_VALUES = ORDER_TYPE_OPTIONS.map((o) => o.value) as [
  OrderType,
  ...OrderType[],
]
