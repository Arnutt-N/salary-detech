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

function healthBadge(b: BatchRow) {
  if (b.blockerOrders > 0)
    return <span className="inline-flex shrink-0 items-center rounded-full bg-red-50 text-red-900 border border-red-200 px-2.5 py-0.5 text-xs font-medium">🔴 มีรายการติดขัด</span>
  if (b.affectedOrders > 0)
    return <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 text-xs font-medium">🟡 มีผลกระทบ</span>
  if (b.totalOrders === 0)
    return <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 text-zinc-700 px-2.5 py-0.5 text-xs font-medium">⚪ ยังไม่มีคำสั่ง</span>
  return <span className="inline-flex shrink-0 items-center rounded-full bg-green-50 text-green-900 border border-green-200 px-2.5 py-0.5 text-xs font-medium">🟢 ผ่านทั้งหมด</span>
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
    cell: (info) => <span className="text-center block text-green-700 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("affectedOrders", {
    header: "ต้องแก้",
    cell: (info) => <span className="text-center block text-amber-800 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("blockerOrders", {
    header: "ติดขัด",
    cell: (info) => <span className="text-center block text-red-700 font-medium">{info.getValue()}</span>,
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
