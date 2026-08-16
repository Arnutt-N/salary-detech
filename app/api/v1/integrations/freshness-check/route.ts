import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isOrderStale } from "@/lib/freshness"

/**
 * POST /api/v1/integrations/freshness-check
 * Check freshness status of orders for external Payroll / ERP systems
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderIds, employeeIds, dateAsOf } = body

    if (!orderIds && !employeeIds) {
      return NextResponse.json(
        { success: false, message: "Provide orderIds (array) or employeeIds (array)" },
        { status: 400 }
      )
    }

    const whereClause: any = { orderStatus: "active" }
    if (orderIds && Array.isArray(orderIds)) {
      whereClause.id = { in: orderIds.map((id: any) => Number(id)) }
    } else if (employeeIds && Array.isArray(employeeIds)) {
      whereClause.employeeId = { in: employeeIds.map((id: any) => Number(id)) }
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
