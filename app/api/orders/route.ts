import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateOrderFreshness, cascadeStaleCheck } from "@/lib/freshness"
import { orderInputToCreateData, type OrderInputBody } from "@/lib/order-payload"
import { orderSchema } from "@/lib/validation/order-schema"

// GET /api/orders — list orders
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const type = searchParams.get("type")
  const status = searchParams.get("status")

  const where: Record<string, unknown> = {}
  if (type) where.orderType = type
  if (status) where.orderStatus = status

  const search = searchParams.get("search")
  if (search) {
    where.OR = [
      { orderNo: { contains: search } },
      { person: { is: { firstName: { contains: search } } } },
      { person: { is: { lastName: { contains: search } } } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { effectiveDate: "desc" },
      include: { person: { select: { firstName: true, lastName: true } } },
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json({ orders, total, page, limit })
}

// POST /api/orders — create new order
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderInputBody & { orderStatus?: string }

    const parsed = orderSchema.safeParse({
      ...body,
      employeeId: body.employeeId,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const order = await prisma.order.create({
      data: orderInputToCreateData(body),
    })

    // Run freshness check + cascade on activation
    let cascadeCount = 0
    if (order.orderStatus === "active") {
      await validateOrderFreshness(order.id)
      cascadeCount = await cascadeStaleCheck(order.id)
    }

    // Create change log
    if (order.orderStatus === "active") {
      await prisma.employeeChangeLog.create({
        data: {
          employeeId: order.employeeId,
          changeType: body.orderType === "salary_increase" || body.orderType === "special_salary"
            ? "salary"
            : body.orderType === "promotion"
            ? "level"
            : body.orderType === "transfer"
            ? "org"
            : "position",
          effectiveDate: order.effectiveDate,
          orderId: order.id,
          newValue: JSON.stringify({
            position_name: body.positionName,
            position_type: body.positionType,
            position_level: body.positionLevel,
            bureau: body.bureau,
            department: body.department,
            ministry: body.ministry,
          }),
        },
      })
    }

    return NextResponse.json({ order, cascadeAffected: cascadeCount }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create order", detail: String(error) },
      { status: 500 }
    )
  }
}
