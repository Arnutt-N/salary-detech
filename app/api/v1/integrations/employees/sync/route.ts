import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapDpisPersonToModel, type DpisPersonRaw } from "@/lib/dpis-mapping"
import { requireIntegrationSecret } from "@/lib/integration-auth"
import {
  dpisPersonRecordSchema,
  MAX_SYNC_RECORDS,
  zodIssueSummary,
} from "@/lib/validation/integration-schema"

/**
 * POST /api/v1/integrations/employees/sync
 * Upsert employees from external HR / DPIS database
 */
export async function POST(req: Request) {
  const unauthorized = requireIntegrationSecret(req)
  if (unauthorized) return unauthorized

  try {
    const body = await req.json()
    const records: unknown[] = Array.isArray(body) ? body : [body]

    if (records.length === 0) {
      return NextResponse.json({ success: false, message: "No employee records provided" }, { status: 400 })
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
      updated: 0,
      errors: [] as { citizenId?: string; error: string }[],
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
