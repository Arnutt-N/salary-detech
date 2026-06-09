import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addOrdersToBatch } from "@/lib/batch-orders"
import type { OrderInputBody } from "@/lib/order-payload"
import type { ImportPreviewRow } from "@/lib/excel-import/types"

/** POST /api/batches/[id]/import — commit previewed rows into batch */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const batchId = parseInt(id)

    const batch = await prisma.orderBatch.findUnique({ where: { id: batchId } })
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }
    if (batch.status !== "draft") {
      return NextResponse.json(
        { error: "Can only import into draft batch" },
        { status: 400 }
      )
    }

    const body = (await request.json()) as { rows?: ImportPreviewRow[] }
    const rows = body.rows ?? []

    const orders: OrderInputBody[] = []
    const errors: string[] = []

    for (const row of rows) {
      if (!row.order || !row.employeeId || row.errors.length > 0) continue
      if (row.matchStatus !== "matched") {
        errors.push(`แถว ${row.sheet}:${row.rowNumber} — ไม่พร้อมนำเข้า`)
        continue
      }
      const { citizenId: _c, personName: _p, ...orderFields } = row.order
      orders.push({
        ...orderFields,
        employeeId: row.employeeId,
        batchId,
        orderStatus: "draft",
      })
    }

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "No valid rows to import", errors },
        { status: 400 }
      )
    }

    const created = await addOrdersToBatch(batchId, orders)

    return NextResponse.json({
      created,
      skipped: rows.length - orders.length,
      errors,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Import failed", detail: String(error) },
      { status: 500 }
    )
  }
}
