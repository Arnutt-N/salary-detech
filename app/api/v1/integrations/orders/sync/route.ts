import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapDpisOrderToModel, type DpisOrderRaw } from "@/lib/dpis-mapping"
import { validateOrderFreshness, cascadeStaleCheck } from "@/lib/freshness"
import { requireIntegrationSecret } from "@/lib/integration-auth"
import {
  dpisOrderRecordSchema,
  MAX_SYNC_RECORDS,
  zodIssueSummary,
} from "@/lib/validation/integration-schema"

/**
 * POST /api/v1/integrations/orders/sync
 * Ingest and validate orders from DPIS / external HR systems
 */
export async function POST(req: Request) {
  const unauthorized = requireIntegrationSecret(req)
  if (unauthorized) return unauthorized

  try {
    const body = await req.json()
    const records: unknown[] = Array.isArray(body) ? body : [body]

    if (records.length === 0) {
      return NextResponse.json({ success: false, message: "No order records provided" }, { status: 400 })
    }

    if (records.length > MAX_SYNC_RECORDS) {
      return NextResponse.json(
        { success: false, message: `Too many records (${records.length}). Limit is ${MAX_SYNC_RECORDS} per request.` },
        { status: 413 }
      )
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
        const parsed = dpisOrderRecordSchema.safeParse(raw)
        if (!parsed.success) {
          results.errors.push({
            comNo: (raw as DpisOrderRaw)?.com_no,
            citizenId: (raw as DpisOrderRaw)?.per_cardno,
            error: `Invalid record: ${zodIssueSummary(parsed.error)}`,
          })
          continue
        }

        const record = parsed.data
        let employeeId = record.employee_id

        // Lookup employee by citizenId if employeeId not directly supplied
        if (!employeeId && record.per_cardno) {
          const person = await prisma.person.findFirst({
            where: { citizenId: record.per_cardno.trim() },
            select: { id: true },
          })
          if (person) employeeId = person.id
        }

        if (!employeeId) {
          results.errors.push({
            comNo: record.com_no ?? undefined,
            citizenId: record.per_cardno ?? undefined,
            error: "Person not found in database. Please sync employee first.",
          })
          continue
        }

        const orderData = mapDpisOrderToModel(raw as DpisOrderRaw, employeeId)
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
          comNo: (raw as DpisOrderRaw)?.com_no,
          citizenId: (raw as DpisOrderRaw)?.per_cardno,
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
