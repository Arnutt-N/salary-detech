import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

/**
 * Fail-closed Bearer auth for /api/v1/integrations/*.
 * Rejects every request unless INTEGRATION_SECRET is configured and the
 * Authorization header matches `Bearer <INTEGRATION_SECRET>`.
 */
export function requireIntegrationSecret(req: Request): NextResponse | null {
  const secret = process.env.INTEGRATION_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "INTEGRATION_SECRET is not configured" },
      { status: 503 }
    )
  }

  const header = req.headers.get("authorization") ?? ""
  const expected = `Bearer ${secret}`
  const authorized =
    header.length === expected.length &&
    timingSafeEqual(Buffer.from(header), Buffer.from(expected))

  if (!authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  return null
}
