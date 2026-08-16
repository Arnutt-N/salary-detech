import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"
import { toThaiDate } from "@/lib/date-utils"
import { getOrderTypeLabel, getOrderStatusLabel } from "@/lib/order-types"
import { FreshnessDimensionBadge } from "@/components/shared/freshness-badge"

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const id = params.id
  const orderId = parseInt(id)

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      person: {
        select: { id: true, firstName: true, lastName: true, currentPositionName: true },
      },
      batch: { select: { batchNo: true, batchType: true } },
    },
  })

  if (!order) notFound()

  // Fetch correctedFrom separately (plain Int field, not relation)
  const correctedFromOrder = order.correctedFrom
    ? await prisma.order.findUnique({
        where: { id: order.correctedFrom },
        select: { id: true, orderNo: true, orderType: true },
      })
    : null

  // Fetch orders that this order corrected (reverse lookup)
  const correctedOrders = (await prisma.order.findMany({
    where: { correctedFrom: orderId },
    select: { id: true, orderNo: true, orderType: true },
  })) as Array<{ id: number; orderNo: string | null; orderType: string }>

  const field = (label: string, value?: string | number | null) => (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value != null ? String(value) : "—"}</p>
    </div>
  )

  const canEdit = ["draft", "active"].includes(order.orderStatus)

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-zinc-400">
        <Link href="/orders" className="hover:underline">คำสั่ง</Link>
        {" / "}
        <span className="text-zinc-700">#{order.id} {order.orderNo || ""}</span>
      </div>

      {/* Order Info Card */}
      <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-balance">
              {getOrderTypeLabel(order.orderType)}
            </h1>
            {order.orderNo && (
              <p className="mt-1 text-sm text-zinc-500">เลขที่: {order.orderNo}</p>
            )}
          </div>
          <span className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-zinc-100 px-3 text-xs">
            {getOrderStatusLabel(order.orderStatus)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 md:grid-cols-3">
          {field("วันที่ลงคำสั่ง", toThaiDate(order.issueDate))}
          {field("วันที่มีผล", toThaiDate(order.effectiveDate))}
          {field("เงินเดือน", order.salary ? `${order.salary.toLocaleString()} บาท` : null)}
          {field("เงินเดือน ณ วันที่", toThaiDate(order.salaryAsOfDate))}
          {field("ตำแหน่ง", order.positionName)}
          {field("ประเภทตำแหน่ง", order.positionType)}
          {field("ระดับ", order.positionLevel)}
          {field("สังกัด", order.bureau)}
          {field("กอง", order.division)}
          {field("กรม", order.department)}
          {field("กระทรวง", order.ministry)}
          {field("ชุดคำสั่ง", order.batch?.batchNo || null)}
        </div>
      </div>

      {/* Freshness Status */}
      <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold">🔍 สถานะความถูกต้อง</h2>
        <div className="flex flex-wrap gap-3">
          <FreshnessDimensionBadge status={order.statusSalary} dimension="เงินเดือน" />
          <FreshnessDimensionBadge status={order.statusPosition} dimension="ตำแหน่ง" />
          <FreshnessDimensionBadge status={order.statusType} dimension="ประเภท" />
          <FreshnessDimensionBadge status={order.statusLevel} dimension="ระดับ" />
          <FreshnessDimensionBadge status={order.statusOrg} dimension="สังกัด" />
        </div>
      </div>

      {/* Correction Chain */}
      {(correctedFromOrder || correctedOrders.length > 0) && (
        <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold mb-4">🔗 สายการแก้ไข</h2>
          <div className="space-y-2 text-sm">
            {correctedFromOrder && (
              <p>
                แก้ไขจาก:{" "}
                <Link href={`/orders/${correctedFromOrder.id}`} className="text-blue-600 hover:underline">
                  #{correctedFromOrder.id} {correctedFromOrder.orderNo || ""} ({getOrderTypeLabel(correctedFromOrder.orderType)})
                </Link>
              </p>
            )}
            {correctedOrders.length > 0 && (
              <p>
                แก้ไขไปยัง:{" "}
                {correctedOrders.map((o, i) => (
                  <span key={o.id}>
                    {i > 0 && ", "}
                    <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                      #{o.id} {o.orderNo || ""} ({getOrderTypeLabel(o.orderType)})
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <Link href={`/orders/${order.id}/edit`} className="btn-primary">
            ✏️ แก้ไข
          </Link>
        )}
        <Link href="/orders" className="btn-secondary">
          ↩️ กลับ
        </Link>
      </div>
    </div>
  )
}
