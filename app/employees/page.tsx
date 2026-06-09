import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { EmployeesTable, type EmployeeRow } from "./EmployeesTable"
import type { PersonListItem } from "@/lib/types"

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
          where: {
            employeeId: { in: ids },
            orderStatus: { in: ["active", "superseded"] },
            OR: [
              { statusSalary: "stale" },
              { statusLevel: "stale" },
              { statusPosition: "stale" },
              { statusType: "stale" },
              { statusOrg: "stale" },
            ],
          },
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
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">👥 ข้าราชการทั้งหมด</h1>
        <Link
          href="/employees/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          ➕ เพิ่มข้าราชการ
        </Link>
      </div>

      <form className="mb-4 flex gap-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="ค้นหาชื่อ-นามสกุล หรือเลขบัตรประชาชน..."
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          ค้นหา
        </button>
      </form>

      <p className="text-sm text-zinc-500 mb-4">
        ทั้งหมด {total} คน | หน้า {currentPage} / {totalPages || 1}
      </p>

      {tableData.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-lg">ยังไม่มีข้อมูลข้าราชการ</p>
          <p className="text-sm mt-1">
            เริ่มต้นด้วยการเพิ่มข้อมูลข้าราชการในระบบ
          </p>
          <Link
            href="/employees/new"
            className="inline-block mt-4 text-blue-600 hover:underline text-sm"
          >
            ➕ เพิ่มข้าราชการคนแรก
          </Link>
        </div>
      ) : (
        <EmployeesTable data={tableData} />
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        {currentPage > 1 && (
          <Link
            href={`/employees?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className="px-3 py-1 text-sm border rounded hover:bg-zinc-100"
          >
            ← ก่อนหน้า
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={`/employees?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className="px-3 py-1 text-sm border rounded hover:bg-zinc-100"
          >
            ถัดไป →
          </Link>
        )}
      </div>
    </div>
  )
}
