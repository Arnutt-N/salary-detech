import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addOrdersToBatch } from "@/lib/batch-orders"
import type { OrderInputBody } from "@/lib/order-payload"

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
        { error: "Can only add orders to draft batch" },
        { status: 400 }
      )
    }

    const { orders: orderData } = (await request.json()) as { orders: OrderInputBody[] }

    const created = await addOrdersToBatch(batchId, orderData)

    return NextResponse.json({ created }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add orders", detail: String(error) },
      { status: 500 }
    )
  }
}
