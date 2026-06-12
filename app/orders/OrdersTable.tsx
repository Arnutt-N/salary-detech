"use client"

import { DataTable } from "@/components/shared/data-table"
import { createColumnHelper } from "@tanstack/react-table"
import Link from "next/link"
import { toThaiDate } from "@/lib/date-utils"
import { getOrderTypeLabel, getOrderStatusLabel, FRESHNESS_COLUMN_LABEL } from "@/lib/order-types"

export type OrderRow = {
  id: number
  orderType: string
  orderNo: string | null
  personId: number | null
  personFirstName: string | null
  personLastName: string | null
  effectiveDate: string | null
  orderStatus: string
  statusSalary: string
  statusPosition: string
  statusType: string
  statusLevel: string
  statusOrg: string
}

function freshnessBadge(order: OrderRow) {
  if (order.orderStatus === "superseded") return { label: "🔴 ถูกแก้ไข", cls: "bg-red-50 text-red-700" }
  const flags = [
    order.statusSalary,
    order.statusPosition,
    order.statusType,
    order.statusLevel,
    order.statusOrg,
  ]
  if (flags.includes("stale")) return { label: "🟡 ต้องแก้ไข", cls: "bg-amber-50 text-amber-700" }
  if (flags.includes("corrected")) return { label: "🟢 แก้ไขแล้ว", cls: "bg-green-50 text-green-700" }
  return { label: "🟢 ล่าสุด", cls: "bg-green-50 text-green-700" }
}

const columnHelper = createColumnHelper<OrderRow>()

const columns = [
  columnHelper.accessor("id", {
    header: "#",
    cell: (info) => <span className="font-mono text-zinc-400">{info.getValue()}</span>,
  }),
  columnHelper.accessor("orderType", {
    header: "ประเภท",
    cell: (info) => getOrderTypeLabel(info.getValue()),
  }),
  columnHelper.accessor("orderNo", {
    header: "เลขที่",
    cell: (info) => (
      <Link href={`/orders/${info.row.original.id}`} className="text-blue-600 hover:underline font-medium">
        {info.getValue() || `#${info.row.original.id}`}
      </Link>
    ),
  }),
  columnHelper.accessor("personFirstName", {
    header: "ข้าราชการ",
    cell: (info) => {
      const row = info.row.original
      return row.personId ? (
        <Link href={`/employees/${row.personId}`} className="text-blue-600 hover:underline">
          {row.personFirstName} {row.personLastName}
        </Link>
      ) : (
        "—"
      )
    },
  }),
  columnHelper.accessor("effectiveDate", {
    header: "วันที่มีผล",
    cell: (info) => <span className="font-mono">{toThaiDate(info.getValue())}</span>,
  }),
  columnHelper.accessor("orderStatus", {
    header: "สถานะ",
    cell: (info) => (
      <span className="text-xs px-2 py-1 rounded-full bg-zinc-100">
        {getOrderStatusLabel(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("statusSalary", {
    header: FRESHNESS_COLUMN_LABEL,
    cell: (info) => {
      const badge = freshnessBadge(info.row.original)
      return (
        <span className={`text-xs px-2 py-1 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      )
    },
  }),
]

export function OrdersTable({ data }: { data: OrderRow[] }) {
  return <DataTable columns={columns} data={data} />
}
