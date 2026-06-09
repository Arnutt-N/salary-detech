/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe, before } from "node:test"
import assert from "node:assert"
import { prisma } from "../lib/prisma"
import { parseImportWorkbook } from "../lib/excel-import/parse-workbook"
import { resolveEmployeeMatches } from "../lib/excel-import/resolve-employees"
import { buildImportWorkbook, SEED_IMPORT_ROW } from "./fixtures/build-import-workbook"
import { POST as previewImport } from "../app/api/batches/[id]/import/preview/route"
import { POST as commitImport } from "../app/api/batches/[id]/import/route"

const CITIZEN_ID = "1100200300401"

let batchId: number
let personId: number

before(async () => {
  await prisma.compensationToSalary.deleteMany()
  await prisma.compensationDisbursement.deleteMany()
  await prisma.compensationRound.deleteMany()
  await prisma.employeeChangeLog.deleteMany()
  await prisma.employeeEducationAdjustment.deleteMany()
  await prisma.salaryAdjustmentApplicant.deleteMany()
  await prisma.salaryBaseAdjustment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.orderBatch.deleteMany()
  await prisma.person.deleteMany()

  const person = await prisma.person.create({
    data: {
      citizenId: CITIZEN_ID,
      nameTitle: "นางสาว",
      firstName: "สมหญิง",
      lastName: "ใจดี",
      currentPositionName: "นักวิชาการเงินและบัญชีปฏิบัติการ",
      currentPositionType: "วิชาการ",
      currentPositionLevel: "ปฏิบัติการ",
      currentBureau: "กองคลัง",
      currentDepartment: "กรมบัญชีกลาง",
      currentMinistry: "กระทรวงการคลัง",
      currentSalary: 20000,
      isActive: true,
    },
  })
  personId = person.id

  const batch = await prisma.orderBatch.create({
    data: {
      batchNo: "IMPORT-TEST-001",
      batchType: "salary_apr",
      effectiveDate: "2025-04-01",
      status: "draft",
    },
  })
  batchId = batch.id
})

describe("excel-import integration", () => {
  test("matches seed person by citizenId from generated workbook", async () => {
    const buffer = await buildImportWorkbook({ salaryRows: [SEED_IMPORT_ROW] })
    const parsed = await parseImportWorkbook(buffer)
    assert.strictEqual(parsed.summary.ready, 1)

    const persons = await prisma.person.findMany({ where: { isActive: true } })
    const rows = resolveEmployeeMatches(parsed.rows, persons)
    assert.strictEqual(rows[0].matchStatus, "matched")
    assert.strictEqual(rows[0].employeeId, personId)
    assert.strictEqual(rows[0].order?.orderType, "salary_increase")
    assert.strictEqual(rows[0].order?.effectiveDate, "2025-04-01")
  })

  test("matches by Thai name with title when citizenId omitted", async () => {
    const buffer = await buildImportWorkbook({
      salaryRows: [{ ...SEED_IMPORT_ROW, citizenId: null }],
    })
    const parsed = await parseImportWorkbook(buffer)
    const persons = await prisma.person.findMany({ where: { isActive: true } })
    const rows = resolveEmployeeMatches(parsed.rows, persons)
    assert.strictEqual(rows[0].matchStatus, "matched")
    assert.strictEqual(rows[0].employeeId, personId)
  })

  test("matches citizenId stored as Excel number", async () => {
    const buffer = await buildImportWorkbook({
      salaryRows: [{ ...SEED_IMPORT_ROW, citizenId: Number(CITIZEN_ID) }],
    })
    const parsed = await parseImportWorkbook(buffer)
    assert.strictEqual(parsed.rows[0].citizenId, CITIZEN_ID)
    const persons = await prisma.person.findMany({ where: { isActive: true } })
    const rows = resolveEmployeeMatches(parsed.rows, persons)
    assert.strictEqual(rows[0].matchStatus, "matched")
  })

  test("preview and commit import API create draft orders in batch", async () => {
    const buffer = await buildImportWorkbook({
      salaryRows: [{ ...SEED_IMPORT_ROW, orderNo: "ลน.2568/IMPORT-API" }],
    })

    const form = new FormData()
    form.append(
      "file",
      new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "import-test.xlsx"
    )

    const previewRes = await previewImport(
      new Request(`http://localhost/api/batches/${batchId}/import/preview`, {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ id: String(batchId) }) as any }
    )
    const previewBody = await previewRes.json()
    assert.strictEqual(previewRes.status, 200)
    assert.ok(previewBody.summary.ready >= 1)

    const commitRes = await commitImport(
      new Request(`http://localhost/api/batches/${batchId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: previewBody.rows }),
      }),
      { params: Promise.resolve({ id: String(batchId) }) as any }
    )
    const commitBody = await commitRes.json()
    assert.strictEqual(commitRes.status, 200)
    assert.ok(commitBody.created >= 1)

    const orders = await prisma.order.findMany({
      where: { batchId, employeeId: personId, orderNo: "ลน.2568/IMPORT-API" },
    })
    assert.strictEqual(orders.length, 1)
    assert.strictEqual(orders[0].orderStatus, "draft")
    assert.strictEqual(orders[0].orderType, "salary_increase")
    assert.strictEqual(orders[0].salary, 21000)
  })

  test("movement sheet imports prior snapshot fields", async () => {
    const buffer = await buildImportWorkbook({
      movementRows: [
        {
          citizenId: CITIZEN_ID,
          personName: "นางสาว สมหญิง ใจดี",
          orderTypeLabel: "ย้าย",
          orderNo: "ลน.2568/MOVE-001",
          issueDate: "15/06/2568",
          effectiveDate: "15/06/2568",
          priorPositionName: "นักวิชาการเงินและบัญชีปฏิบัติการ",
          priorSalary: 21000,
          priorSalaryAsOfDate: "01/04/2568",
          positionName: "นักวิชาการเงินและบัญชีปฏิบัติการ",
          salary: 21000,
          salaryAsOfDate: "01/04/2568",
          bureau: "กองพัสดุ",
          department: "กรมบัญชีกลาง",
          ministry: "กระทรวงการคลัง",
          positionType: "วิชาการ",
          positionLevel: "ปฏิบัติการ",
        },
      ],
    })

    const parsed = await parseImportWorkbook(buffer)
    assert.strictEqual(parsed.summary.ready, 1)
    const persons = await prisma.person.findMany({ where: { isActive: true } })
    const rows = resolveEmployeeMatches(parsed.rows, persons)
    assert.strictEqual(rows[0].matchStatus, "matched")
    assert.strictEqual(rows[0].order?.orderType, "transfer")
    assert.strictEqual(rows[0].order?.priorSalary, 21000)
    assert.strictEqual(rows[0].order?.bureau, "กองพัสดุ")
  })
})
