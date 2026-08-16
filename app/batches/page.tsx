import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { BatchesTable, type BatchRow } from "./BatchesTable"
import { EmptyState } from "@/components/shared/empty-state"

export default async function BatchesPage() {
  const batches = await prisma.orderBatch.findMany({
    orderBy: { createdAt: "desc" },
  })

  const tableData: BatchRow[] = (batches as BatchRow[]).map((b) => ({
    id: b.id,
    batchNo: b.batchNo,
    batchType: b.batchType,
    effectiveDate: b.effectiveDate,
    totalOrders: b.totalOrders,
    cleanOrders: b.cleanOrders,
    affectedOrders: b.affectedOrders,
    blockerOrders: b.blockerOrders,
  }))

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">📦 ชุดคำสั่ง (Batches)</h1>
        <Link href="/batches/new" className="btn-primary">
          + สร้างชุดใหม่
        </Link>
      </div>

      {tableData.length === 0 ? (
        <EmptyState
          icon="📦"
          title="ยังไม่มีชุดคำสั่ง"
          description="ชุดคำสั่งช่วยนำเข้าและอนุมัติหลายคำสั่งพร้อมกัน พร้อม preview ผลกระทบก่อนเปิดใช้"
          action={{ href: "/batches/new", label: "สร้างชุดคำสั่งแรก" }}
        />
      ) : (
        <BatchesTable data={tableData} />
      )}
    </div>
  )
}
