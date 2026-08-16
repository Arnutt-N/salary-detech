import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapDpisOrderToModel, type DpisOrderRaw } from "@/lib/dpis-mapping"
import { validateOrderFreshness, cascadeStaleCheck } from "@/lib/freshness"

/**
 * POST /api/v1/integrations/orders/sync
 * Ingest and validate orders from DPIS / external HR systems
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const records: DpisOrderRaw[] = Array.isArray(body) ? body : [body]

    if (records.length === 0) {
      return NextResponse.json({ success: false, message: "No order records provided" }, { status: 400 })
    }

    const results = {
      total: records.length,
      created: 0,
      staleFound: 0,
      cascaded: 0,
      errors: [] as { comNo?: string; citizenId?: string; error: string }[],
    }

    for (const raw of records) {
      try {
        let employeeId = raw.employee_id

        // Lookup employee by citizenId if employeeId not directly supplied
        if (!employeeId && raw.per_cardno) {
          const person = await prisma.person.findFirst({
            where: { citizenId: raw.per_cardno.trim() },
            select: { id: true },
          })
          if (person) employeeId = person.id
        }

        if (!employeeId) {
          results.errors.push({
            comNo: raw.com_no,
            citizenId: raw.per_cardno,
            error: "Person not found in database. Please sync employee first.",
          })
          continue
        }

        const orderData = mapDpisOrderToModel(raw, employeeId)
        const newOrder = await prisma.order.create({
          data: orderData,
        })

        // Run Realtime Freshness Validation
        const freshness = await validateOrderFreshness(newOrder.id)
        if (freshness.overallStatus === "stale") {
          results.staleFound++
        }

        // Run Cascade Check
        const cascadeCount = await cascadeStaleCheck(newOrder.id)
        results.cascaded += cascadeCount

        results.created++
      } catch (err: unknown) {
        results.errors.push({
          comNo: raw.com_no,
          citizenId: raw.per_cardno,
          error: err instanceof Error ? err.message : "Failed to import order",
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
