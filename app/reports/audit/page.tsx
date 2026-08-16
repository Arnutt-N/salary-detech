import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { AuditTable, type AuditRow } from "./AuditTable"
import type { AuditChangeResult } from "@/lib/types"
import { EmptyState } from "@/components/shared/empty-state"

const PAGE_SIZE = 50

const fieldLabel: Record<string, string> = {
  salary: "💰 เงินเดือน",
  position: "📋 ตำแหน่ง",
  level: "📊 ระดับ",
  type: "🏷️ ประเภทตำแหน่ง",
  org: "🏢 สังกัด",
  qualification: "🎓 วุฒิ",
  status: "📌 สถานะ",
}

export default async function AuditReportPage({
  searchParams,
}: {
  searchParams: {
    page?: string
    search?: string
    changeType?: string
    orderType?: string
    dateFrom?: string
    dateTo?: string
  }
}) {
  const currentPage = parseInt(searchParams.page || "1")
  const search = searchParams.search || ""
  const changeType = searchParams.changeType || ""
  const orderType = searchParams.orderType || ""
  const dateFrom = searchParams.dateFrom || ""
  const dateTo = searchParams.dateTo || ""

  const where: Record<string, unknown> = {}
  if (search) {
    where.person = {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ],
    }
  }
  if (changeType) where.changeType = changeType
  if (orderType) where.order = { orderType }
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59.999Z")
    where.createdAt = createdAt
  }

  const [changes, total] = await Promise.all([
    prisma.employeeChangeLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        changeType: true,
        effectiveDate: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        person: { select: { id: true, firstName: true, lastName: true } },
        order: {
          select: { id: true, orderNo: true, orderType: true, effectiveDate: true },
        },
      },
    }),
    prisma.employeeChangeLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const tableData: AuditRow[] = (changes as AuditChangeResult[]).map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    changeType: c.changeType,
    oldValue: c.oldValue,
    newValue: c.newValue,
    personId: c.person.id,
    personFirstName: c.person.firstName,
    personLastName: c.person.lastName,
    orderId: c.order?.id ?? null,
    orderNo: c.order?.orderNo ?? null,
    orderType: c.order?.orderType ?? null,
  }))

  const queryString = (extra: Record<string, string>) => {
    const p = new URLSearchParams()
    const params = {
      search,
      changeType,
      orderType,
      dateFrom,
      dateTo,
      ...extra,
    }
    for (const [k, v] of Object.entries(params)) {
      if (v) p.set(k, v)
    }
    return p.toString()
  }

  const hasFilters = Boolean(search || changeType || orderType || dateFrom || dateTo)

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-bold">
        📜 ประวัติการเปลี่ยนแปลง
      </h1>

      {/* Filters */}
      <form className="mb-6 space-y-3 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="ค้นหาชื่อ..."
            className="input-touch min-w-[150px] flex-1"
          />
          <select
            name="changeType"
            defaultValue={changeType}
            className="input-touch"
          >
            <option value="">ทุกประเภทการเปลี่ยน</option>
            {Object.entries(fieldLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="dateFrom"
            defaultValue={dateFrom}
            className="input-touch"
            placeholder="ตั้งแต่"
          />
          <input
            type="date"
            name="dateTo"
            defaultValue={dateTo}
            className="input-touch"
            placeholder="ถึง"
          />
          <button type="submit" className="btn-primary shrink-0">
            กรอง
          </button>
          <Link href="/reports/audit" className="btn-secondary shrink-0">
            ล้าง
          </Link>
        </div>
      </form>

      <p className="text-sm text-zinc-500 mb-4">
        ทั้งหมด {total} รายการ | หน้า {currentPage} / {totalPages || 1}
      </p>

      {tableData.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon="🔍"
            title="ไม่พบรายการที่ตรงกับเงื่อนไข"
            description="ลองเปลี่ยนคำค้นหา ประเภทการเปลี่ยน หรือช่วงวันที่"
            action={{ href: "/reports/audit", label: "ล้างตัวกรอง", variant: "secondary" }}
          />
        ) : (
          <EmptyState
            icon="📜"
            title="ยังไม่มีประวัติการเปลี่ยนแปลง"
            description="เมื่อมีคำสั่งเปิดใช้และอัปเดตข้อมูลข้าราชการ ระบบจะบันทึก audit trail ที่นี่"
            action={{ href: "/orders", label: "ดูคำสั่งทั้งหมด", variant: "secondary" }}
          />
        )
      ) : (
        <AuditTable data={tableData} />
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        {currentPage > 1 && (
          <Link
            href={`/reports/audit?${queryString({ page: String(currentPage - 1) })}`}
            className="pagination-link"
          >
            ← ก่อนหน้า
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={`/reports/audit?${queryString({ page: String(currentPage + 1) })}`}
            className="pagination-link"
          >
            ถัดไป →
          </Link>
        )}
      </div>
    </div>
  )
}
