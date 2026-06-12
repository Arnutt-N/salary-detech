"use client"

import { DataTable } from "@/components/shared/data-table"
import { createColumnHelper } from "@tanstack/react-table"
import Link from "next/link"
import { toThaiDate } from "@/lib/date-utils"
import { getOrderTypeLabel, getOrderStatusLabel } from "@/lib/order-types"

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
      <Link href={`/orders/${info.getValue()}`} className="font-mono text-blue-600 hover:underline">
        {info.getValue()}
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
      const warnings: string[] = []
      if (row.statusSalary === "stale") warnings.push("💰 เงินเดือน")
      if (row.statusLevel === "stale") warnings.push("📊 ระดับ")
      if (row.statusPosition === "stale") warnings.push("📋 ตำแหน่ง")
      if (row.statusType === "stale") warnings.push("🏷️ ประเภท")
      if (row.statusOrg === "stale") warnings.push("🏢 สังกัด")
      return (
        <>
          {warnings.map((w, i) => (
            <span key={i} className="inline-block text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded mr-1 mb-0.5">
              {w}
            </span>
          ))}
        </>
      )
    },
  }),
  columnHelper.accessor("orderStatus", {
    header: "สถานะ",
    cell: (info) => (
      <span className={`text-xs px-2 py-1 rounded-full ${info.getValue() === "superseded" ? "bg-zinc-100 text-zinc-600" : "bg-red-50 text-red-700"}`}>
        {getOrderStatusLabel(info.getValue())}
      </span>
    ),
  }),
]

export function StaleTable({ data }: { data: StaleRow[] }) {
  return <DataTable columns={columns} data={data} />
}
