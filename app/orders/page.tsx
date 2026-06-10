import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ORDER_TYPE_OPTIONS, ORDER_STATUS_OPTIONS } from "@/lib/order-types"
import { OrdersTable, type OrderRow } from "./OrdersTable"

const PAGE_SIZE = 50

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; type?: string; status?: string }
}) {
  const currentPage = parseInt(searchParams.page || "1")
  const search = searchParams.search || ""
  const type = searchParams.type || ""
  const status = searchParams.status || ""

  const where: Record<string, unknown> = {}
  if (type) where.orderType = type
  if (status) where.orderStatus = status
  if (search) {
    where.OR = [
      { orderNo: { contains: search } },
      { person: { is: { firstName: { contains: search } } } },
      { person: { is: { lastName: { contains: search } } } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { effectiveDate: "desc" },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.order.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const tableData: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderType: o.orderType,
    orderNo: o.orderNo,
    personId: o.person?.id ?? null,
    personFirstName: o.person?.firstName ?? null,
    personLastName: o.person?.lastName ?? null,
    effectiveDate: o.effectiveDate,
    orderStatus: o.orderStatus,
    statusSalary: o.statusSalary,
    statusPosition: o.statusPosition,
    statusType: o.statusType,
    statusLevel: o.statusLevel,
    statusOrg: o.statusOrg,
  }))

  const queryString = (extra: Record<string, string>) => {
    const p = new URLSearchParams()
    const params = { search, type, status, ...extra }
    for (const [k, v] of Object.entries(params)) {
      if (v) p.set(k, v)
    }
    return p.toString()
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📋 คำสั่งทั้งหมด</h1>
        <Link
          href="/orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          ➕ สร้างคำสั่งใหม่
        </Link>
      </div>

      {/* Filters */}
      <form className="mb-4 p-4 bg-white rounded-lg border space-y-3">
        <div className="flex gap-2 flex-wrap items-end">
          <input
            name="search"
            defaultValue={search}
            placeholder="ค้นหาเลขที่/ชื่อ..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm min-w-[150px]"
          />
          <select name="type" defaultValue={type} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">ทุกประเภท</option>
            {ORDER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">ทุกสถานะ</option>
            {ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            ค้นหา
          </button>
          <Link href="/orders" className="px-4 py-2 border rounded-lg text-sm hover:bg-zinc-50">
            ล้าง
          </Link>
        </div>
      </form>

      <p className="text-sm text-zinc-500 mb-4">
        ทั้งหมด {total} คำสั่ง | หน้า {currentPage} / {totalPages || 1}
      </p>

      {tableData.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-lg">ยังไม่มีคำสั่ง</p>
          <p className="text-sm mt-1">
            เริ่มต้นด้วยการ{" "}
            <Link href="/orders/new" className="text-blue-600 hover:underline">
              สร้างคำสั่งใหม่
            </Link>
          </p>
        </div>
      ) : (
        <OrdersTable data={tableData} />
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        {currentPage > 1 && (
          <Link
            href={`/orders?${queryString({ page: String(currentPage - 1) })}`}
            className="px-3 py-1 text-sm border rounded hover:bg-zinc-100"
          >
            ← ก่อนหน้า
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={`/orders?${queryString({ page: String(currentPage + 1) })}`}
            className="px-3 py-1 text-sm border rounded hover:bg-zinc-100"
          >
            ถัดไป →
          </Link>
        )}
      </div>
    </div>
  )
}
