import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { STALE_ORDER_WHERE } from "@/lib/freshness"
import { EmployeesTable, type EmployeeRow } from "./EmployeesTable"
import type { PersonListItem } from "@/lib/types"
import { EmptyState } from "@/components/shared/empty-state"

const PAGE_SIZE = 50

function buildSearchWhere(search: string): Record<string, unknown> {
  if (!search) return {}
  const digitSearch = search.replace(/\D/g, "")
  const or: Record<string, unknown>[] = [
    { firstName: { contains: search } },
    { lastName: { contains: search } },
  ]
  if (digitSearch.length >= 4) {
    or.push({ citizenId: { contains: digitSearch } })
  }
  return { OR: or }
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string }
}) {
  const currentPage = parseInt(searchParams.page || "1")
  const search = searchParams.search || ""

  const where: Record<string, unknown> = buildSearchWhere(search)

  const [persons, total] = await Promise.all([
    prisma.person.findMany({
      where,
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { id: "asc" },
      select: {
        id: true,
        nameTitle: true,
        firstName: true,
        lastName: true,
        citizenId: true,
        currentPositionName: true,
        currentPositionType: true,
        currentPositionLevel: true,
        currentBureau: true,
        isActive: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.person.count({ where }),
  ])

  // Stale count — findMany + manual count (avoids groupBy compatibility)
  const ids = (persons as PersonListItem[]).map((p) => p.id)
  const staleOrders =
    ids.length > 0
      ? await prisma.order.findMany({
          where: { employeeId: { in: ids }, ...STALE_ORDER_WHERE },
          select: { employeeId: true, id: true },
        })
      : []

  const staleMap = new Map<number, number>()
  for (const o of staleOrders) {
    staleMap.set(o.employeeId, (staleMap.get(o.employeeId) ?? 0) + 1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const tableData: EmployeeRow[] = (persons as PersonListItem[]).map((p) => ({
    id: p.id,
    nameTitle: p.nameTitle,
    firstName: p.firstName,
    lastName: p.lastName,
    citizenId: p.citizenId ?? null,
    currentPositionName: p.currentPositionName,
    currentPositionType: p.currentPositionType,
    currentPositionLevel: p.currentPositionLevel,
    currentBureau: p.currentBureau,
    orderCount: p._count.orders,
    isActive: p.isActive,
    staleCount: staleMap.get(p.id) ?? 0,
  }))

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">👥 ข้าราชการทั้งหมด</h1>
        <Link href="/employees/new" className="btn-primary">
          ➕ เพิ่มข้าราชการ
        </Link>
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="ค้นหาชื่อ-นามสกุล หรือเลขบัตรประชาชน..."
          className="input-touch min-w-0 flex-1"
        />
        <button type="submit" className="btn-primary shrink-0">
          ค้นหา
        </button>
      </form>

      <p className="text-sm text-zinc-500 mb-4">
        ทั้งหมด {total} คน | หน้า {currentPage} / {totalPages || 1}
      </p>

      {tableData.length === 0 ? (
        search ? (
          <EmptyState
            icon="🔍"
            title="ไม่พบข้าราชการที่ตรงกับคำค้นหา"
            description="ลองค้นหาด้วยชื่อ นามสกุล หรือเลขบัตรประชาชนอีกครั้ง"
            action={{ href: "/employees", label: "ล้างคำค้นหา", variant: "secondary" }}
          />
        ) : (
          <EmptyState
            icon="👥"
            title="ยังไม่มีข้อมูลข้าราชการ"
            description="เพิ่มข้อมูลข้าราชการก่อนสร้างหรือนำเข้าคำสั่ง เพื่อให้ระบบตรวจความถูกต้องได้"
            action={{ href: "/employees/new", label: "เพิ่มข้าราชการคนแรก" }}
          />
        )
      ) : (
        <EmployeesTable data={tableData} />
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        {currentPage > 1 && (
          <Link
            href={`/employees?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className="pagination-link"
          >
            ← ก่อนหน้า
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={`/employees?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className="pagination-link"
          >
            ถัดไป →
          </Link>
        )}
      </div>
    </div>
  )
}
