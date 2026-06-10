"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function BatchActions({
  batchId,
  status,
  hasBlockers,
}: {
  batchId: number
  status: string
  hasBlockers: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function action(mode: "preview" | "approve-all" | "approve-clean" | "reject") {
    setLoading(mode)
    try {
      const endpoint =
        mode === "preview"
          ? `/api/batches/${batchId}/preview`
          : `/api/batches/${batchId}/approve`

      const body =
        mode === "preview"
          ? undefined
          : mode === "approve-clean"
          ? { mode: "clean" }
          : mode === "reject"
          ? { mode: "reject" }
          : { mode: "all" }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (res.ok) {
        toast.success(
          mode === "preview"
            ? "Preview สำเร็จ"
            : mode === "reject"
            ? "Reject ชุดคำสั่งแล้ว"
            : "Approve สำเร็จ"
        )
        router.refresh()
      } else {
        const err = await res.json()
        toast.error(err.error || "ดำเนินการไม่สำเร็จ")
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(null)
    }
  }

  const canPreview = status === "draft"
  const canApprove = status === "previewed"

  return (
    <div className="flex gap-2 mb-6">
      {canPreview && (
        <button
          type="button"
          data-testid="batch-preview"
          onClick={() => action("preview")}
          disabled={!!loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading === "preview" ? "⏳ Previewing..." : "🔍 Preview"}
        </button>
      )}
      {canApprove && (
        <>
          <button
            type="button"
            data-testid="batch-approve-all"
            onClick={() => action("approve-all")}
            disabled={!!loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            ✅ Approve All
          </button>
          {hasBlockers && (
            <button
              onClick={() => action("approve-clean")}
              disabled={!!loading}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              ⚠️ Approve Clean Only
            </button>
          )}
          <button
            onClick={() => action("reject")}
            disabled={!!loading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            ❌ Reject
          </button>
        </>
      )}
    </div>
  )
}
