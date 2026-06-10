"use client"

import { DataTable } from "@/components/shared/data-table"
import { createColumnHelper } from "@tanstack/react-table"
import Link from "next/link"
import { getOrderTypeLabel } from "@/lib/order-types"
import { toThaiDate } from "@/lib/date-utils"

export type BatchRow = {
  id: number
  batchNo: string
  batchType: string
  effectiveDate: string | null
  totalOrders: number
  cleanOrders: number
  affectedOrders: number
  blockerOrders: number
}

function healthBadge(b: BatchRow): string {
  if (b.blockerOrders > 0) return "🔴 มี blocker"
  if (b.affectedOrders > 0) return "🟡 มีผลกระทบ"
  if (b.totalOrders === 0) return "⚪ ยังไม่มีคำสั่ง"
  return "🟢 ผ่านทั้งหมด"
}

const columnHelper = createColumnHelper<BatchRow>()

const columns = [
  columnHelper.accessor("batchNo", {
    header: "เลขที่",
    cell: (info) => (
      <Link href={`/batches/${info.row.original.id}`} className="text-blue-600 hover:underline font-mono text-sm">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("batchType", {
    header: "ประเภท",
    cell: (info) => getOrderTypeLabel(info.getValue()),
  }),
  columnHelper.accessor("effectiveDate", {
    header: "วันที่มีผล",
    cell: (info) => <span className="whitespace-nowrap">{toThaiDate(info.getValue())}</span>,
  }),
  columnHelper.accessor("totalOrders", {
    header: "ทั้งหมด",
    cell: (info) => <span className="text-center block">{info.getValue()}</span>,
  }),
  columnHelper.accessor("cleanOrders", {
    header: "ผ่าน",
    cell: (info) => <span className="text-center block text-green-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor("affectedOrders", {
    header: "ต้องแก้",
    cell: (info) => <span className="text-center block text-amber-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor("blockerOrders", {
    header: "blocker",
    cell: (info) => <span className="text-center block text-red-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor("totalOrders", {
    id: "health",
    header: "สถานะ",
    cell: (info) => healthBadge(info.row.original),
  }),
]

export function BatchesTable({ data }: { data: BatchRow[] }) {
  return <DataTable columns={columns} data={data} />
}
