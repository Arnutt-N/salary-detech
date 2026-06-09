import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseImportWorkbook } from "@/lib/excel-import/parse-workbook"
import { loadPersonsForImport, resolveEmployeeMatches } from "@/lib/excel-import/resolve-employees"

const MAX_BYTES = 10 * 1024 * 1024

async function getDraftBatch(batchId: number) {
  const batch = await prisma.orderBatch.findUnique({ where: { id: batchId } })
  if (!batch) return { error: NextResponse.json({ error: "Batch not found" }, { status: 404 }) }
  if (batch.status !== "draft") {
    return {
      error: NextResponse.json(
        { error: "Can only import into draft batch" },
        { status: 400 }
      ),
    }
  }
  return { batch }
}

async function readUploadFile(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")
  if (!file || !(file instanceof Blob)) {
    return { error: NextResponse.json({ error: "Missing file upload" }, { status: 400 }) }
  }
  if (file.size > MAX_BYTES) {
    return { error: NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 }) }
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  return { buffer }
}

/** POST /api/batches/[id]/import/preview — parse Excel, match employees */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const batchId = parseInt(id)
    const batchResult = await getDraftBatch(batchId)
    if ("error" in batchResult && batchResult.error) return batchResult.error

    const fileResult = await readUploadFile(request)
    if ("error" in fileResult && fileResult.error) return fileResult.error

    const parsed = await parseImportWorkbook(fileResult.buffer!)
    const persons = await loadPersonsForImport()
    const rows = resolveEmployeeMatches(parsed.rows, persons)

    const ready = rows.filter((r) => r.order && r.employeeId && r.errors.length === 0).length
    const errors = rows.filter((r) => r.errors.length > 0).length

    return NextResponse.json({
      rows,
      summary: {
        ...parsed.summary,
        ready,
        errors,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Import preview failed", detail: String(error) },
      { status: 500 }
    )
  }
}
