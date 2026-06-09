/**
 * E2E: import-sample-seed.xlsx → batch preview → approve → cascade verify
 * Mirrors UI fetch calls (BatchImportPanel + BatchActions).
 * Run: npx tsx scripts/e2e-batch-import-flow.ts
 */
import { readFile } from "node:fs/promises"
import path from "node:path"
import { prisma } from "../lib/prisma"
import { parseImportWorkbook } from "../lib/excel-import/parse-workbook"
import { loadPersonsForImport, resolveEmployeeMatches } from "../lib/excel-import/resolve-employees"
import { POST as previewImport } from "../app/api/batches/[id]/import/preview/route"
import { POST as commitImport } from "../app/api/batches/[id]/import/route"
import { POST as previewBatch } from "../app/api/batches/[id]/preview/route"
import { POST as approveBatch } from "../app/api/batches/[id]/approve/route"

const SAMPLE = path.join("docs", "templates", "import-sample-seed.xlsx")

async function main() {
  const person = await prisma.person.findFirst({
    where: { citizenId: "1100200300401" },
  })
  if (!person) {
    throw new Error("Seed person 1100200300401 not found — run: npx tsx prisma/seed.ts")
  }

  const batch = await prisma.orderBatch.create({
    data: {
      batchNo: `E2E-FLOW-${Date.now()}`,
      batchType: "salary_apr",
      effectiveDate: "2025-04-01",
      status: "draft",
      description: "E2E import → preview → approve",
    },
  })

  const beforeActive = await prisma.order.count({
    where: { employeeId: person.id, orderStatus: "active" },
  })
  const beforeStale = await prisma.order.count({
    where: {
      employeeId: person.id,
      orderStatus: { in: ["active", "superseded"] },
      OR: [
        { statusSalary: "stale" },
        { statusLevel: "stale" },
        { statusPosition: "stale" },
        { statusType: "stale" },
        { statusOrg: "stale" },
      ],
    },
  })

  // Step 1: Import preview (UI: BatchImportPanel Preview)
  const buffer = await readFile(SAMPLE)
  const form = new FormData()
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "import-sample-seed.xlsx"
  )
  const previewImportRes = await previewImport(
    new Request(`http://localhost/api/batches/${batch.id}/import/preview`, {
      method: "POST",
      body: form,
    }),
    { params: Promise.resolve({ id: String(batch.id) }) }
  )
  const previewImportBody = await previewImportRes.json()
  if (!previewImportRes.ok) {
    throw new Error(`Import preview failed: ${JSON.stringify(previewImportBody)}`)
  }
  console.log(`✓ Import preview: ${previewImportBody.summary.ready} rows ready`)

  // Step 2: Commit import (UI: นำเข้าคำสั่งที่พร้อม)
  const commitRes = await commitImport(
    new Request(`http://localhost/api/batches/${batch.id}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: previewImportBody.rows }),
    }),
    { params: Promise.resolve({ id: String(batch.id) }) }
  )
  const commitBody = await commitRes.json()
  if (!commitRes.ok) {
    throw new Error(`Import commit failed: ${JSON.stringify(commitBody)}`)
  }
  console.log(`✓ Import commit: ${commitBody.created} draft orders`)

  const draftCount = await prisma.order.count({
    where: { batchId: batch.id, orderStatus: "draft" },
  })
  if (draftCount !== commitBody.created) {
    throw new Error(`Expected ${commitBody.created} draft orders, got ${draftCount}`)
  }

  // Step 3: Batch preview (UI: 🔍 Preview)
  const batchPreviewRes = await previewBatch(
    new Request(`http://localhost/api/batches/${batch.id}/preview`, { method: "POST" }),
    { params: Promise.resolve({ id: String(batch.id) }) }
  )
  const batchPreviewBody = await batchPreviewRes.json()
  if (!batchPreviewRes.ok) {
    throw new Error(`Batch preview failed: ${JSON.stringify(batchPreviewBody)}`)
  }
  const updatedBatch = await prisma.orderBatch.findUnique({ where: { id: batch.id } })
  if (updatedBatch?.status !== "previewed") {
    throw new Error(`Expected batch status previewed, got ${updatedBatch?.status}`)
  }
  console.log(
    `✓ Batch preview: status=previewed, clean=${batchPreviewBody.cleanOrders}, cascade=${batchPreviewBody.cascadeTotal}`
  )

  // Step 4: Approve all (UI: ✅ Approve All)
  const approveRes = await approveBatch(
    new Request(`http://localhost/api/batches/${batch.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "all" }),
    }),
    { params: Promise.resolve({ id: String(batch.id) }) }
  )
  const approveBody = await approveRes.json()
  if (!approveRes.ok) {
    throw new Error(`Approve failed: ${JSON.stringify(approveBody)}`)
  }
  console.log(
    `✓ Approve: ${approveBody.approved} activated, cascadeAffected=${approveBody.cascadeAffected}, status=${approveBody.status}`
  )

  const finalBatch = await prisma.orderBatch.findUnique({ where: { id: batch.id } })
  const activeInBatch = await prisma.order.count({
    where: { batchId: batch.id, orderStatus: "active" },
  })
  const afterActive = await prisma.order.count({
    where: { employeeId: person.id, orderStatus: "active" },
  })
  const afterStale = await prisma.order.count({
    where: {
      employeeId: person.id,
      orderStatus: { in: ["active", "superseded"] },
      OR: [
        { statusSalary: "stale" },
        { statusLevel: "stale" },
        { statusPosition: "stale" },
        { statusType: "stale" },
        { statusOrg: "stale" },
      ],
    },
  })

  console.log("\n--- Summary ---")
  console.log(`Batch #${batch.id} (${batch.batchNo}): ${finalBatch?.status}`)
  console.log(`Active orders in batch: ${activeInBatch}`)
  console.log(`Person active orders: ${beforeActive} → ${afterActive}`)
  console.log(`Person stale flags: ${beforeStale} → ${afterStale}`)
  console.log(`Batch cascadeTotal: ${finalBatch?.cascadeTotal}`)

  if (activeInBatch !== approveBody.approved) {
    throw new Error("Active count mismatch after approve")
  }
  if (finalBatch?.status !== "approved") {
    throw new Error(`Expected batch approved, got ${finalBatch?.status}`)
  }

  console.log("\n✅ E2E flow passed — open UI at /batches/" + batch.id)
}

main()
  .catch((e) => {
    console.error("❌", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
