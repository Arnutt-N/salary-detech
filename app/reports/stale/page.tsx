import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { STALE_ORDER_WHERE } from "@/lib/freshness"
import { ORDER_TYPE_OPTIONS } from "@/lib/order-types"
import { StaleTable, type StaleRow } from "./StaleTable"
import { EmptyState } from "@/components/shared/empty-state"

export default async function StaleReportPage({
  searchParams,
}: {
  searchParams: { page?: string; type?: string }
}) {
  const currentPage = parseInt(searchParams.page || "1")
  const type = searchParams.type || ""
  const PAGE_SIZE = 50

  const where: Record<string, unknown> = { ...STALE_ORDER_WHERE }
  if (type) where.orderType = type

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

  const tableData: StaleRow[] = orders.map((o) => ({
    id: o.id,
    orderType: o.orderType,
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

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4">🚨 คำสั่งที่ต้องแก้ไข</h1>

      {/* Filters */}
      <form className="mb-4 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <select
            name="type"
            defaultValue={type}
            className="input-touch"
          >
            <option value="">ทุกประเภท</option>
            {ORDER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            กรอง
          </button>
          <Link href="/reports/stale" className="btn-secondary">
            ล้าง
          </Link>
          <div className="hidden flex-1 sm:block" />
          <a
            href={`/api/reports/stale/export?format=xlsx${type ? `&type=${type}` : ""}`}
            className="btn-secondary"
          >
            📥 Excel
          </a>
          <a
            href={`/api/reports/stale/export?format=csv${type ? `&type=${type}` : ""}`}
            className="btn-secondary"
          >
            📥 CSV
          </a>
        </div>
      </form>

      <p className="text-sm text-zinc-500 mb-4">
        พบ {total} คำสั่ง | หน้า {currentPage} / {totalPages || 1}
      </p>

      {tableData.length === 0 ? (
        type ? (
          <EmptyState
            icon="🔍"
            title="ไม่พบคำสั่งที่ต้องแก้ไขในประเภทนี้"
            description="ลองเลือกประเภทอื่น หรือล้างตัวกรองเพื่อดูทั้งหมด"
            action={{ href: "/reports/stale", label: "ล้างตัวกรอง", variant: "secondary" }}
          />
        ) : (
          <EmptyState
            icon="✅"
            title="ไม่มีคำสั่งที่ต้องแก้ไข"
            description="ข้อมูลในคำสั่งทั้งหมดตรงกับข้อเท็จจริง ณ วันที่มีผล"
          />
        )
      ) : (
        <StaleTable data={tableData} />
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        {currentPage > 1 && (
          <Link
            href={`/reports/stale?page=${currentPage - 1}${type ? `&type=${type}` : ""}`}
            className="pagination-link"
          >
            ← ก่อนหน้า
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={`/reports/stale?page=${currentPage + 1}${type ? `&type=${type}` : ""}`}
            className="pagination-link"
          >
            ถัดไป →
          </Link>
        )}
      </div>
    </div>
  )
}
