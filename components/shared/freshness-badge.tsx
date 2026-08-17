import { getFreshnessFlagLabel, getFreshnessFlagPlainLabel } from "@/lib/order-types"

/** WCAG-friendly surface classes for freshness flag values */
export function freshnessSurfaceClass(status: string): string {
  if (status === "stale") return "bg-amber-50 text-amber-900 border-amber-200"
  if (status === "corrected") return "bg-red-50 text-red-900 border-red-200"
  return "bg-green-50 text-green-900 border-green-200"
}

export function FreshnessDimensionBadge({
  status,
  dimension,
}: {
  status: string
  dimension: string
}) {
  const statusText = getFreshnessFlagPlainLabel(status)
  return (
    <span
      role="status"
      aria-label={`${dimension}: ${statusText}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${freshnessSurfaceClass(status)}`}
    >
      <span className="font-medium">{dimension}</span>
      <span aria-hidden="true" className="opacity-50">
        ·
      </span>
      <span>{statusText}</span>
    </span>
  )
}

type FreshnessFlags = {
  orderStatus: string
  statusSalary: string
  statusPosition: string
  statusType: string
  statusLevel: string
  statusOrg: string
}

/** Single aggregate badge for order list tables */
export function FreshnessSummaryBadge({ order }: { order: FreshnessFlags }) {
  if (order.orderStatus === "superseded") {
    return (
      <span
        role="status"
        aria-label="ถูกแก้ไข"
        className="inline-flex shrink-0 items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-900"
      >
        🔴 ถูกแก้ไข
      </span>
    )
  }

  const flags = [
    order.statusSalary,
    order.statusPosition,
    order.statusType,
    order.statusLevel,
    order.statusOrg,
  ]

  let status = "latest"
  if (flags.includes("stale")) status = "stale"
  else if (flags.includes("corrected")) status = "corrected"

  return (
    <span
      role="status"
      aria-label={getFreshnessFlagPlainLabel(status)}
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${freshnessSurfaceClass(status)}`}
    >
      {getFreshnessFlagLabel(status)}
    </span>
  )
}

export function StaleDimensionChip({ label }: { label: string }) {
  return (
    <span className="mb-0.5 mr-1 inline-block rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-900">
      {label}
    </span>
  )
}
