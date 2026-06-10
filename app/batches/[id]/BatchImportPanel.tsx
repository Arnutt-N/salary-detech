"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import type { ImportPreviewRow } from "@/lib/excel-import/types"

interface PreviewResponse {
  rows: ImportPreviewRow[]
  summary: {
    total: number
    ready: number
    errors: number
    skipped: number
    bySheet: Record<string, number>
  }
}

export function BatchImportPanel({ batchId, status }: { batchId: number; status: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  if (status !== "draft") return null

  const handlePreview = async () => {
    if (!file) {
      toast.error("กรุณาเลือกไฟล์ Excel")
      return
    }
    setLoading("preview")
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`/api/batches/${batchId}/import/preview`, {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Preview ไม่สำเร็จ")
        return
      }
      setPreview(data)
      toast.success(`พบ ${data.summary.ready} แถวพร้อมนำเข้า`)
    } catch {
      toast.error("Preview ไม่สำเร็จ")
    } finally {
      setLoading(null)
    }
  }

  const handleImport = async () => {
    if (!preview?.rows.length) {
      toast.error("กรุณา Preview ก่อน")
      return
    }
    const readyRows = preview.rows.filter(
      (r) => r.order && r.employeeId && r.matchStatus === "matched" && r.errors.length === 0
    )
    if (readyRows.length === 0) {
      toast.error("ไม่มีแถวที่พร้อมนำเข้า")
      return
    }
    setLoading("import")
    try {
      const res = await fetch(`/api/batches/${batchId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: readyRows }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "นำเข้าไม่สำเร็จ")
        return
      }
      toast.success(`นำเข้า ${data.created} คำสั่ง`)
      setPreview(null)
      setFile(null)
      router.refresh()
    } catch {
      toast.error("นำเข้าไม่สำเร็จ")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
      <h2 className="text-lg font-bold mb-2">📥 นำเข้าจาก Excel</h2>
      <p className="text-sm text-zinc-500 mb-4">
        ใช้เทมเพลท{" "}
        <code className="text-xs bg-zinc-100 px-1 rounded">docs/templates/template-salary-detect.xlsx</code>{" "}
        หรือไฟล์ตัวอย่างที่มีข้อมูล{" "}
        <code className="text-xs bg-zinc-100 px-1 rounded">docs/templates/import-sample-seed.xlsx</code>{" "}
        แผ่น <strong>movement</strong>, <strong>salary</strong>, <strong>resign</strong>
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-zinc-500">ไฟล์ .xlsx</label>
          <input
            type="file"
            data-testid="import-file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setPreview(null)
            }}
            className="w-full text-sm mt-1"
          />
        </div>
        <button
          type="button"
          data-testid="import-preview"
          onClick={handlePreview}
          disabled={!!loading || !file}
          className="px-4 py-2 border rounded-lg text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading === "preview" ? "⏳ กำลังตรวจ..." : "🔍 Preview"}
        </button>
        <button
          type="button"
          data-testid="import-commit"
          onClick={handleImport}
          disabled={!!loading || !preview?.summary.ready}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading === "import" ? "⏳ กำลังนำเข้า..." : "✅ นำเข้าคำสั่งที่พร้อม"}
        </button>
      </div>

      {preview && (
        <div className="mt-4 text-sm space-y-2">
          <p>
            ทั้งหมด {preview.summary.total} แถว · พร้อม {preview.summary.ready} · ผิดพลาด{" "}
            {preview.summary.errors}
          </p>
          {preview.rows.some((r) => r.errors.length > 0) && (
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-red-50 text-red-800 text-xs space-y-1">
              {preview.rows
                .filter((r) => r.errors.length > 0)
                .slice(0, 20)
                .map((r) => (
                  <div key={`${r.sheet}-${r.rowNumber}`}>
                    [{r.sheet} แถว {r.rowNumber}] {r.errors.join("; ")}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
