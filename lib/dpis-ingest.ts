import { prisma } from "./prisma"
import {
  mapDpisOrderToModel,
  mapDpisPersonToModel,
  type DpisOrderRaw,
  type DpisPersonRaw,
} from "./dpis-mapping"
import { validateOrderFreshness, cascadeStaleCheck } from "./freshness"
import {
  dpisOrderRecordSchema,
  dpisPersonRecordSchema,
  zodIssueSummary,
} from "./validation/integration-schema"

/**
 * Shared DPIS ingest pipeline used by both the push API routes
 * (/api/v1/integrations/.../sync) and the scheduled pull agent (P7).
 * Correctness comes from idempotency: persons upsert by citizenId,
 * orders dedupe by (orderNo, employeeId) — re-running a sync always
 * yields the same database state.
 */

export interface PersonSyncResult {
  total: number
  created: number
  updated: number
  errors: { citizenId?: string; error: string }[]
}

export interface OrderSyncResult {
  total: number
  created: number
  skipped: number
  updated: number
  staleFound: number
  cascaded: number
  errors: { comNo?: string; citizenId?: string; error: string }[]
}

export async function ingestPersons(records: unknown[]): Promise<PersonSyncResult> {
  const results: PersonSyncResult = {
    total: records.length,
    created: 0,
    updated: 0,
    errors: [],
  }

  for (const raw of records) {
    try {
      const parsed = dpisPersonRecordSchema.safeParse(raw)
      if (!parsed.success) {
        results.errors.push({
          citizenId: (raw as DpisPersonRaw)?.per_cardno,
          error: `Invalid record: ${zodIssueSummary(parsed.error)}`,
        })
        continue
      }

      if (!parsed.data.per_cardno && !parsed.data.per_name) {
        results.errors.push({ error: "Missing required citizen ID or name" })
        continue
      }

      const personData = mapDpisPersonToModel(raw as DpisPersonRaw)

      if (personData.citizenId) {
        const existing = await prisma.person.findFirst({
          where: { citizenId: personData.citizenId },
        })

        if (existing) {
          await prisma.person.update({
            where: { id: existing.id },
            data: personData,
          })
          results.updated++
        } else {
          await prisma.person.create({
            data: personData,
          })
          results.created++
        }
      } else {
        await prisma.person.create({
          data: personData,
        })
        results.created++
      }
    } catch (err: unknown) {
      results.errors.push({
        citizenId: (raw as DpisPersonRaw)?.per_cardno,
        error: err instanceof Error ? err.message : "Failed to process record",
      })
    }
  }

  return results
}

function snapshotDiffers(
  existing: Record<string, unknown>,
  snapshot: Record<string, unknown>
): boolean {
  return Object.entries(snapshot).some(([key, value]) => (existing[key] ?? null) !== (value ?? null))
}

export async function ingestOrders(records: unknown[]): Promise<OrderSyncResult> {
  const results: OrderSyncResult = {
    total: records.length,
    created: 0,
    skipped: 0,
    updated: 0,
    staleFound: 0,
    cascaded: 0,
    errors: [],
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

      // Dedupe by (orderNo, employeeId) — DPIS is the source of truth, so a
      // re-pushed order updates its snapshot instead of creating a duplicate.
      // Only snapshot fields change; local lifecycle (orderStatus) is kept.
      const snapshot: Partial<typeof orderData> = { ...orderData }
      delete snapshot.employeeId
      delete snapshot.orderStatus

      const existing = orderData.orderNo
        ? await prisma.order.findFirst({
            where: { orderNo: orderData.orderNo, employeeId },
          })
        : null

      if (existing) {
        if (!snapshotDiffers(existing as unknown as Record<string, unknown>, snapshot)) {
          results.skipped++
          continue
        }

        await prisma.order.update({
          where: { id: existing.id },
          data: snapshot,
        })

        const freshness = await validateOrderFreshness(existing.id)
        if (freshness.overallStatus === "stale") {
          results.staleFound++
        }
        results.cascaded += await cascadeStaleCheck(existing.id)
        results.updated++
        continue
      }

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

  return results
}
