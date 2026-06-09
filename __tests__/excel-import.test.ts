import { test, describe } from "node:test"
import assert from "node:assert"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseExcelDate } from "@/lib/excel-import/parse-date"
import { resolveOrderTypeFromLabel } from "@/lib/excel-import/order-type-labels"
import { parseImportWorkbook } from "@/lib/excel-import/parse-workbook"
import { resolveEmployeeMatches } from "@/lib/excel-import/resolve-employees"
import type { Person } from "@prisma/client"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatePath = path.join(__dirname, "..", "docs", "templates", "template-salary-detect.xlsx")

describe("excel-import", () => {
  test("parseExcelDate handles DD/MM/BE", () => {
    assert.strictEqual(parseExcelDate("01/10/2568"), "2025-10-01")
    assert.strictEqual(parseExcelDate("02/04/2569"), "2026-04-02")
  })

  test("resolveOrderTypeFromLabel maps Thai labels", () => {
    assert.strictEqual(resolveOrderTypeFromLabel("เลื่อนระดับ"), "promotion")
    assert.strictEqual(resolveOrderTypeFromLabel("เลื่อนเงินเดือน"), "salary_increase")
    assert.strictEqual(resolveOrderTypeFromLabel("", "resign"), "resign")
  })

  test("parseImportWorkbook reads template sheets", async () => {
    const buffer = await readFile(templatePath)
    const result = await parseImportWorkbook(buffer)
    assert.ok(result.summary.total >= 0)
    assert.ok(Array.isArray(result.rows))
  })

  test("resolveEmployeeMatches by citizen ID", () => {
    const persons = [
      {
        id: 1,
        citizenId: "1234567890123",
        firstName: "สมชาย",
        lastName: "ใจดี",
      },
    ] as Person[]

    const rows = resolveEmployeeMatches(
      [
        {
          sheet: "salary",
          rowNumber: 5,
          citizenId: "1234567890123",
          personName: "สมชาย ใจดี",
          employeeId: null,
          matchStatus: "not_found",
          order: {
            orderType: "salary_increase",
            issueDate: "2025-04-01",
            effectiveDate: "2025-04-01",
          },
          errors: [],
          warnings: [],
        },
      ],
      persons
    )

    assert.strictEqual(rows[0].matchStatus, "matched")
    assert.strictEqual(rows[0].employeeId, 1)
  })

  test("resolveEmployeeMatches strips Thai name titles", () => {
    const persons = [
      {
        id: 2,
        citizenId: null,
        nameTitle: "นางสาว",
        firstName: "สมหญิง",
        lastName: "ใจดี",
      },
    ] as Person[]

    const rows = resolveEmployeeMatches(
      [
        {
          sheet: "salary",
          rowNumber: 2,
          citizenId: null,
          personName: "นางสาว สมหญิง ใจดี",
          employeeId: null,
          matchStatus: "not_found",
          order: {
            orderType: "salary_increase",
            issueDate: "2025-04-01",
            effectiveDate: "2025-04-01",
          },
          errors: [],
          warnings: [],
        },
      ],
      persons
    )

    assert.strictEqual(rows[0].matchStatus, "matched")
    assert.strictEqual(rows[0].employeeId, 2)
  })
})
