"use client"

import { DataTable } from "@/components/shared/data-table"
import { createColumnHelper } from "@tanstack/react-table"
import Link from "next/link"
import { toThaiDate } from "@/lib/date-utils"
import { getOrderTypeLabel, getOrderStatusLabel, FRESHNESS_COLUMN_LABEL } from "@/lib/order-types"
import { FreshnessSummaryBadge } from "@/components/shared/freshness-badge"

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

const columnHelper = createColumnHelper<OrderRow>()

const columns = [
  columnHelper.accessor("id", {
    header: "#",
    cell: (info) => <span className="font-mono text-zinc-500">{info.getValue()}</span>,
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
      <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
        {getOrderStatusLabel(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("statusSalary", {
    header: FRESHNESS_COLUMN_LABEL,
    cell: (info) => <FreshnessSummaryBadge order={info.row.original} />,
  }),
]

export function OrdersTable({ data }: { data: OrderRow[] }) {
  return <DataTable columns={columns} data={data} />
}
