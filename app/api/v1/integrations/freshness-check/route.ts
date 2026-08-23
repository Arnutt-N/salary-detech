import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isOrderStale } from "@/lib/freshness"
import { requireIntegrationSecret } from "@/lib/integration-auth"
import { freshnessCheckSchema } from "@/lib/validation/integration-schema"

/**
 * POST /api/v1/integrations/freshness-check
 * Check freshness status of orders for external Payroll / ERP systems
 */
export async function POST(req: Request) {
  const unauthorized = requireIntegrationSecret(req)
  if (unauthorized) return unauthorized

  try {
    const body = await req.json()
    const parsed = freshnessCheckSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      )
    }

    const { orderIds, employeeIds } = parsed.data

    const whereClause: Prisma.OrderWhereInput = { orderStatus: "active" }
    if (orderIds?.length) {
      whereClause.id = { in: orderIds }
    } else if (employeeIds?.length) {
      whereClause.employeeId = { in: employeeIds }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        person: {
          select: {
            id: true,
            citizenId: true,
            firstName: true,
            lastName: true,
            currentSalary: true,
          },
        },
      },
    })

    const evaluated = []
    for (const order of orders) {
      const freshness = await isOrderStale(order)
      evaluated.push({
        orderId: order.id,
        orderNo: order.orderNo,
        orderType: order.orderType,
        effectiveDate: order.effectiveDate,
        employee: {
          id: order.person.id,
          citizenId: order.person.citizenId,
          name: `${order.person.firstName ?? ""} ${order.person.lastName ?? ""}`.trim(),
        },
        freshness: {
          overallStatus: freshness.overallStatus,
          statusSalary: freshness.statusSalary,
          statusLevel: freshness.statusLevel,
          statusPosition: freshness.statusPosition,
          statusType: freshness.statusType,
          statusOrg: freshness.statusOrg,
        },
        payrollAction: freshness.overallStatus === "stale" ? "HOLD_AND_REVISE" : "PROCEED",
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalEvaluated: evaluated.length,
        cleanOrders: evaluated.filter((e) => e.freshness.overallStatus === "latest").length,
        staleOrders: evaluated.filter((e) => e.freshness.overallStatus === "stale").length,
      },
      data: evaluated,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
