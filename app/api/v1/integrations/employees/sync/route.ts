import { NextResponse } from "next/server"
import { ingestPersons } from "@/lib/dpis-ingest"
import { requireIntegrationSecret } from "@/lib/integration-auth"
import { MAX_SYNC_RECORDS } from "@/lib/validation/integration-schema"

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

    const results = await ingestPersons(records)
    return NextResponse.json({ success: true, data: results })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
