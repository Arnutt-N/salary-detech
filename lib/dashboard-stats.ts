import { prisma } from "@/lib/prisma"

export type DashboardKpis = {
  totalOrders: number
  activeOrders: number
  staleCount: number
  totalBatches: number
  pendingBatches: number
  totalPersons: number
}

/** Single round-trip to Turso for all dashboard KPI counts. */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const [row] = await prisma.$queryRaw<
    {
      total_orders: bigint
      active_orders: bigint
      stale_count: bigint
      total_batches: bigint
      pending_batches: bigint
      total_persons: bigint
    }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM orders) AS total_orders,
      (SELECT COUNT(*) FROM orders WHERE order_status = 'active') AS active_orders,
      (SELECT COUNT(*) FROM orders
        WHERE order_status IN ('active', 'superseded')
          AND (
            status_salary = 'stale'
            OR status_level = 'stale'
            OR status_position = 'stale'
            OR status_type = 'stale'
            OR status_org = 'stale'
          )
      ) AS stale_count,
      (SELECT COUNT(*) FROM order_batches) AS total_batches,
      (SELECT COUNT(*) FROM order_batches
        WHERE status IN ('draft', 'previewing', 'previewed')
      ) AS pending_batches,
      (SELECT COUNT(*) FROM persons WHERE is_active = 1) AS total_persons
  `

  return {
    totalOrders: Number(row.total_orders),
    activeOrders: Number(row.active_orders),
    staleCount: Number(row.stale_count),
    totalBatches: Number(row.total_batches),
    pendingBatches: Number(row.pending_batches),
    totalPersons: Number(row.total_persons),
  }
}
