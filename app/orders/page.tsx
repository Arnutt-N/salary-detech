import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ORDER_TYPE_OPTIONS, ORDER_STATUS_OPTIONS } from "@/lib/order-types"
import { OrdersTable, type OrderRow } from "./OrdersTable"
import { EmptyState } from "@/components/shared/empty-state"

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

  const hasFilters = Boolean(search || type || status)

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">📋 คำสั่งทั้งหมด</h1>
        <Link href="/orders/new" className="btn-primary">
          ➕ สร้างคำสั่งใหม่
        </Link>
      </div>

      {/* Filters */}
      <form className="mb-4 space-y-3 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="ค้นหาเลขที่/ชื่อ..."
            className="input-touch min-w-[150px] flex-1"
          />
          <select name="type" defaultValue={type} className="input-touch">
            <option value="">ทุกประเภท</option>
            {ORDER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="input-touch">
            <option value="">ทุกสถานะ</option>
            {ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary shrink-0">
            ค้นหา
          </button>
          <Link href="/orders" className="btn-secondary shrink-0">
            ล้าง
          </Link>
        </div>
      </form>

      <p className="text-sm text-zinc-500 mb-4">
        ทั้งหมด {total} คำสั่ง | หน้า {currentPage} / {totalPages || 1}
      </p>

      {tableData.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon="🔍"
            title="ไม่พบคำสั่งที่ตรงกับเงื่อนไข"
            description="ลองเปลี่ยนคำค้นหา ประเภท หรือสถานะ แล้วค้นหาอีกครั้ง"
            action={{ href: "/orders", label: "ล้างตัวกรอง", variant: "secondary" }}
          />
        ) : (
          <EmptyState
            icon="📋"
            title="ยังไม่มีคำสั่ง"
            description="สร้างคำสั่งเดี่ยว หรือนำเข้าผ่านชุดคำสั่ง เพื่อเริ่มตรวจความถูกต้องของข้อมูล"
            action={{ href: "/orders/new", label: "สร้างคำสั่งใหม่" }}
            secondaryAction={{ href: "/batches/new", label: "สร้างชุดคำสั่ง" }}
          />
        )
      ) : (
        <OrdersTable data={tableData} />
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        {currentPage > 1 && (
          <Link
            href={`/orders?${queryString({ page: String(currentPage - 1) })}`}
            className="pagination-link"
          >
            ← ก่อนหน้า
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={`/orders?${queryString({ page: String(currentPage + 1) })}`}
            className="pagination-link"
          >
            ถัดไป →
          </Link>
        )}
      </div>
    </div>
  )
}
