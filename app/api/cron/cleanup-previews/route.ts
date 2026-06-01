import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  // Vercel Cron passes CRON_SECRET in Authorization header
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const expired = await prisma.order.updateMany({
      where: {
        orderStatus: "preview",
        previewExpiresAt: { lt: new Date() },
      },
      data: { orderStatus: "cancelled" },
    })

    return NextResponse.json({
      cleaned: expired.count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Cleanup failed", detail: String(error) },
      { status: 500 }
    )
  }
}
