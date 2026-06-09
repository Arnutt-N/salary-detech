/**
 * Prepare draft batch for UI E2E test. Prints batch ID to stdout.
 * Run: npx tsx scripts/prepare-batch-e2e.ts
 */
import { prisma } from "../lib/prisma"

async function main() {
  const batch = await prisma.orderBatch.create({
    data: {
      batchNo: `E2E-IMPORT-${Date.now()}`,
      batchType: "salary_apr",
      effectiveDate: "2025-04-01",
      status: "draft",
      description: "E2E import → preview → approve",
    },
  })
  console.log(batch.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
