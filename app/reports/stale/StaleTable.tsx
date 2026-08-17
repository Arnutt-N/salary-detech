"use client"

import { DataTable } from "@/components/shared/data-table"
import { createColumnHelper } from "@tanstack/react-table"
import Link from "next/link"
import { toThaiDate } from "@/lib/date-utils"
import { getOrderTypeLabel, getOrderStatusLabel, getStaleDimensionLabels } from "@/lib/order-types"
import { StaleDimensionChip } from "@/components/shared/freshness-badge"

export type StaleRow = {
  id: number
  orderType: string
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

const columnHelper = createColumnHelper<StaleRow>()

const columns = [
  columnHelper.accessor("id", {
    header: "#",
    cell: (info) => (
      <Link href={`/orders/${info.getValue()}`} className="font-mono text-blue-700 hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("personFirstName", {
    header: "ข้าราชการ",
    cell: (info) => {
      const row = info.row.original
      return row.personId ? (
        <Link href={`/employees/${row.personId}`} className="text-blue-700 hover:underline">
          {row.personFirstName} {row.personLastName}
        </Link>
      ) : (
        "—"
      )
    },
  }),
  columnHelper.accessor("orderType", {
    header: "ประเภท",
    cell: (info) => (
      <Link href={`/orders/${info.row.original.id}`} className="hover:underline">
        {getOrderTypeLabel(info.getValue())}
      </Link>
    ),
  }),
  columnHelper.accessor("effectiveDate", {
    header: "วันที่มีผล",
    cell: (info) => <span className="font-mono">{toThaiDate(info.getValue())}</span>,
  }),
  columnHelper.accessor("statusSalary", {
    header: "ปัญหา",
    cell: (info) => {
      const row = info.row.original
      const warnings = getStaleDimensionLabels(row)
      return (
        <>
          {warnings.map((w, i) => (
            <StaleDimensionChip key={i} label={w} />
          ))}
        </>
      )
    },
  }),
  columnHelper.accessor("orderStatus", {
    header: "สถานะ",
    cell: (info) => (
      <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${info.getValue() === "superseded" ? "bg-zinc-100 text-zinc-800" : "bg-red-50 text-red-900 border border-red-200"}`}>
        {getOrderStatusLabel(info.getValue())}
      </span>
    ),
  }),
]

export function StaleTable({ data }: { data: StaleRow[] }) {
  return <DataTable columns={columns} data={data} />
}
