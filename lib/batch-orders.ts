import { prisma } from "@/lib/prisma"
import { orderInputToCreateData, type OrderInputBody } from "@/lib/order-payload"

const CHUNK_SIZE = 50

export async function addOrdersToBatch(batchId: number, orders: OrderInputBody[]) {
  let created = 0

  for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
    const chunk = orders.slice(i, i + CHUNK_SIZE)
    const result = await prisma.order.createMany({
      data: chunk.map((body) => ({
        ...orderInputToCreateData({ ...body, batchId, orderStatus: "draft" }),
      })),
    })
    created += result.count
  }

  if (created > 0) {
    await prisma.orderBatch.update({
      where: { id: batchId },
      data: { totalOrders: { increment: created } },
    })
  }

  return created
}
