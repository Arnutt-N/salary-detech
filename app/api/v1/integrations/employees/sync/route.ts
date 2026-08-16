import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapDpisPersonToModel, type DpisPersonRaw } from "@/lib/dpis-mapping"

/**
 * POST /api/v1/integrations/employees/sync
 * Upsert employees from external HR / DPIS database
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const records: DpisPersonRaw[] = Array.isArray(body) ? body : [body]

    if (records.length === 0) {
      return NextResponse.json({ success: false, message: "No employee records provided" }, { status: 400 })
    }

    const results = {
      total: records.length,
      created: 0,
      updated: 0,
      errors: [] as { citizenId?: string; error: string }[],
    }

    for (const raw of records) {
      try {
        if (!raw.per_cardno && !raw.per_name) {
          results.errors.push({ error: "Missing required citizen ID or name" })
          continue
        }

        const personData = mapDpisPersonToModel(raw)

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
      } catch (err: any) {
        results.errors.push({
          citizenId: raw.per_cardno,
          error: err?.message || "Failed to process record",
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
