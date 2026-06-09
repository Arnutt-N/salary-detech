/**
 * Generate docs/templates/import-sample-seed.xlsx for manual import testing.
 * Run: npx tsx scripts/generate-import-sample.ts
 */
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { buildImportWorkbook, SEED_IMPORT_ROW } from "../__tests__/fixtures/build-import-workbook"

async function main() {
  const buffer = await buildImportWorkbook({
    salaryRows: [SEED_IMPORT_ROW],
    movementRows: [
      {
        ...SEED_IMPORT_ROW,
        orderTypeLabel: "ย้าย",
        orderNo: "ลน.2568/IMPORT-MOVE",
        issueDate: "15/06/2568",
        effectiveDate: "15/06/2568",
        priorPositionName: SEED_IMPORT_ROW.positionName,
        priorSalary: 21000,
        priorSalaryAsOfDate: "01/04/2568",
        bureau: "กองพัสดุ",
        salary: 21000,
      },
    ],
  })

  const outPath = path.join("docs", "templates", "import-sample-seed.xlsx")
  await writeFile(outPath, buffer)
  console.log(`✅ Wrote ${outPath}`)
  console.log("   Match seed person citizenId: 1100200300401 (สมหญิง ใจดี)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
