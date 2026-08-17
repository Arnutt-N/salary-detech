import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getOrderTypeLabel,
  getOrderStatusLabel,
  getBatchStatusLabel,
  formatStaleDimensionCount,
  countStaleDimensions,
  FRESHNESS_COLUMN_LABEL,
} from "@/lib/order-types"
import { toThaiDate } from "@/lib/date-utils"
import { BatchActions } from "./BatchActions"
import { BatchImportPanel } from "./BatchImportPanel"
import type { OrderWithPersonMinimal } from "@/lib/types"

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const batch = await prisma.orderBatch.findUnique({
    where: { id: parseInt(id) },
    include: {
        orders: {
        select: {
          id: true,
          orderNo: true,
          orderType: true,
          effectiveDate: true,
          orderStatus: true,
          statusSalary: true,
          statusLevel: true,
          statusPosition: true,
          statusType: true,
          statusOrg: true,
          person: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { effectiveDate: "desc" },
      },
    },
  })

  if (!batch) notFound()

  const orders = batch.orders as OrderWithPersonMinimal[]

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/batches" className="hover:underline">ชุดคำสั่ง</Link>
        {" / "}
        <span className="text-zinc-700">{batch.batchNo}</span>
      </div>

      <h1 className="text-2xl font-bold mb-2">📦 {batch.batchNo}</h1>
      <p className="text-zinc-500 mb-4">{batch.description || "—"}</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        <Stat label="ทั้งหมด" value={batch.totalOrders} />
        <Stat label="✅ ผ่าน" value={batch.cleanOrders} color="text-green-700" />
        <Stat label="⚠️ กระทบ" value={batch.affectedOrders} color="text-amber-800" />
        <Stat label="🔴 ติดขัด" value={batch.blockerOrders} color="text-red-700" />
        <Stat label="🔗 กระทบต่อเนื่อง" value={batch.cascadeTotal} />
        <Stat label="สถานะ" value={getBatchStatusLabel(batch.status)} testId="batch-status" />
      </div>

      <BatchImportPanel batchId={batch.id} status={batch.status} />

      <BatchActions
        batchId={batch.id}
        status={batch.status}
        hasBlockers={batch.blockerOrders > 0}
      />

      <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">บุคคล</th>
              <th className="text-left p-2">ประเภท</th>
              <th className="text-left p-2">วันที่มีผล</th>
              <th className="text-left p-2">สถานะ</th>
              <th className="text-left p-2">{FRESHNESS_COLUMN_LABEL}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const staleFlags = countStaleDimensions(o)
              return (
                <tr key={o.id} className="border-b hover:bg-zinc-50">
                  <td className="p-2 font-mono">
                    <Link href={`/orders/${o.id}`} className="text-blue-700 hover:underline">
                      {o.id}
                    </Link>
                  </td>
                  <td className="p-2">
                    {o.person?.id ? (
                      <Link
                        href={`/employees/${o.person.id}`}
                        className="text-blue-700 hover:underline"
                      >
                        {o.person.firstName} {o.person.lastName}
                      </Link>
                    ) : (
                      <>
                        {o.person?.firstName} {o.person?.lastName}
                      </>
                    )}
                  </td>
                  <td className="p-2">{getOrderTypeLabel(o.orderType)}</td>
                  <td className="p-2 whitespace-nowrap">{toThaiDate(o.effectiveDate)}</td>
                  <td className="p-2">{getOrderStatusLabel(o.orderStatus)}</td>
                  <td className="p-2">{formatStaleDimensionCount(staleFlags)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  color = "text-zinc-900",
  testId,
}: {
  label: string
  value: number | string
  color?: string
  testId?: string
}) {
  return (
    <div
      className="bg-white rounded-lg p-3 text-center shadow-sm border"
      {...(testId ? { "data-testid": testId } : {})}
    >
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  )
}
