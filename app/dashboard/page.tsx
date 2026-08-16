import { prisma } from "@/lib/prisma"
import { getDashboardKpis } from "@/lib/dashboard-stats"
import { STALE_ORDER_WHERE } from "@/lib/freshness"
import {
  getOrderTypeLabel,
  getStaleDimensionLabels,
  STALE_REPORT_ACTION_LABEL,
} from "@/lib/order-types"
import { StaleDimensionChip } from "@/components/shared/freshness-badge"
import { toThaiDate } from "@/lib/date-utils"
import Link from "next/link"
import type { RecentOrderWithPerson, StaleOrderWithPerson } from "@/lib/types"
import { EmptyState } from "@/components/shared/empty-state"
import { GettingStartedPanel } from "@/components/shared/getting-started-panel"

export default async function DashboardPage() {
  const staleWhere = STALE_ORDER_WHERE

  const kpisPromise = getDashboardKpis()

  const recentOrdersPromise = prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      orderType: true,
      orderNo: true,
      effectiveDate: true,
      orderStatus: true,
      createdAt: true,
      person: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  const staleOrdersPromise = prisma.order.findMany({
    where: staleWhere,
    orderBy: [{ employeeId: "asc" }, { effectiveDate: "desc" }],
    take: 30,
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
  })

  const [
    { totalOrders, activeOrders, staleCount, totalBatches, pendingBatches, totalPersons },
    recentOrders,
    staleOrders,
  ] = await Promise.all([kpisPromise, recentOrdersPromise, staleOrdersPromise])

  const recent = recentOrders as RecentOrderWithPerson[]
  const stale = staleOrders as StaleOrderWithPerson[]
  const isFreshInstall =
    totalOrders === 0 && totalPersons === 0 && totalBatches === 0

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">📊 แผงควบคุม</h1>

      {isFreshInstall ? <GettingStartedPanel /> : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card label="คำสั่งทั้งหมด" value={totalOrders} href="/orders" />
        <Card label="คำสั่งมีผล" value={activeOrders} href="/orders?status=active" />
        <Card
          label="ต้องแก้ไข"
          value={staleCount}
          href={staleCount > 0 ? "#stale" : "/reports/stale"}
          alert={staleCount > 0}
        />
        <Card label="ชุดคำสั่ง" value={totalBatches} href="/batches" />
        <Card
          label="รอดำเนินการ"
          value={pendingBatches}
          href="/batches"
          alert={pendingBatches > 0}
        />
        <Card label="ข้าราชการ" value={totalPersons} href="/employees" />
      </div>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-bold mb-3">🕐 กิจกรรมล่าสุด</h2>
        {recent.length === 0 ? (
          <EmptyState
            icon="🕐"
            title="ยังไม่มีกิจกรรมล่าสุด"
            description="เมื่อมีการสร้างหรือเปิดใช้คำสั่ง รายการจะแสดงที่นี่เพื่อให้ติดตามได้เร็ว"
            action={{ href: "/orders/new", label: "สร้างคำสั่งใหม่" }}
            secondaryAction={{ href: "/batches/new", label: "สร้างชุดคำสั่ง" }}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full min-w-[480px]">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">วันที่</th>
                  <th className="text-left p-3 text-sm font-medium">ประเภท</th>
                  <th className="text-left p-3 text-sm font-medium">ข้าราชการ</th>
                  <th className="text-left p-3 text-sm font-medium">วันที่มีผล</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b hover:bg-zinc-50 text-sm">
                    <td className="p-3 text-zinc-500 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("th-TH")}
                    </td>
                    <td className="p-3">
                      <Link href={`/orders/${o.id}`} className="hover:underline">
                        {getOrderTypeLabel(o.orderType)}
                      </Link>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/employees/${o.person.id}`}
                        className="text-blue-700 hover:underline"
                      >
                        {o.person.firstName} {o.person.lastName}
                      </Link>
                    </td>
                    <td className="p-3 text-xs whitespace-nowrap">{toThaiDate(o.effectiveDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {staleCount > 0 ? (
        <section id="stale">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              🚨 คำสั่งที่ต้องแก้ไข ({staleCount})
            </h2>
            <Link href="/reports/stale" className="btn-secondary text-sm">
              {STALE_REPORT_ACTION_LABEL}
            </Link>
          </div>

          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full min-w-[480px]">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">ข้าราชการ</th>
                  <th className="text-left p-3 text-sm font-medium">ประเภท</th>
                  <th className="text-left p-3 text-sm font-medium">วันที่มีผล</th>
                  <th className="text-left p-3 text-sm font-medium">ปัญหา</th>
                </tr>
              </thead>
              <tbody>
                {stale.map((o) => {
                  const warnings = getStaleDimensionLabels(o)
                  return (
                    <tr
                      key={o.id}
                      className="border-b hover:bg-red-50 text-sm"
                    >
                      <td className="p-3">
                        <Link
                          href={`/employees/${o.person.id}`}
                          className="text-blue-700 hover:underline"
                        >
                          {o.person.firstName} {o.person.lastName}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Link href={`/orders/${o.id}`} className="hover:underline">
                          {getOrderTypeLabel(o.orderType)}
                        </Link>
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">
                        {toThaiDate(o.effectiveDate)}
                      </td>
                      <td className="p-3">
                        {warnings.map((label) => (
                          <StaleDimensionChip key={label} label={label} />
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {staleCount > 30 ? (
            <p className="mt-2 text-xs text-zinc-500">
              แสดง 30 จาก {staleCount.toLocaleString()} รายการ —{" "}
              <Link href="/reports/stale" className="text-blue-700 hover:underline">
                {STALE_REPORT_ACTION_LABEL}
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function Card({
  label,
  value,
  href,
  alert,
}: {
  label: string
  value: number
  href: string
  alert?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 transition-colors ${
        alert
          ? "border-red-200 bg-red-50 hover:border-red-300"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <div
        className={`text-2xl font-bold ${alert ? "text-red-700" : "text-zinc-900"}`}
      >
        {value.toLocaleString()}
      </div>
      <div
        className={`mt-1 text-sm ${alert ? "text-red-800" : "text-zinc-600"}`}
      >
        {label}
      </div>
    </Link>
  )
}
