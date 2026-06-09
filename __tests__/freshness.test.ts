import { test, describe, before, after } from "node:test"
import assert from "node:assert"
import { prisma } from "../lib/prisma"
import { compareBusinessDates } from "../lib/date-utils"
import {
  isOrderStale,
  validateOrderFreshness,
  getMaxSalaryEffectiveDate,
  cascadeStaleCheck,
  hasDependency,
  previewImpact,
} from "../lib/freshness"
import { FRESHNESS_ADJUST_DATE, seedFreshnessDb } from "./fixtures/seed-freshness"

let personId: number

before(async () => {
  const data = await seedFreshnessDb()
  personId = data.personId
})

after(async () => {
  // Cleanup handled by seedFreshnessDb on next run
})

describe("isOrderStale", () => {
  test("returns latest when salaryAsOfDate matches person current data", async () => {
    const order = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "transfer",
        issueDate: "2569-01-15",
        effectiveDate: "2569-02-01",
        salaryAsOfDate: "2569-02-01",
        positionName: "นักจัดการงานทั่วไป",
        positionType: "วิชาการ",
        positionLevel: "ชำนาญการ",
        bureau: "กองการเจ้าหน้าที่",
        division: "กลุ่มงานทะเบียนประวัติ",
        department: "สำนักงานปลัดกระทรวง",
        ministry: "กระทรวงทดสอบ",
      },
    })

    const result = await isOrderStale(order)
    assert.strictEqual(result.overallStatus, "latest")
  })

  test("G1: stale when effective on/after adjust_date but salaryAsOfDate is older", async () => {
    const order = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "transfer",
        issueDate: "2569-01-15",
        effectiveDate: "2569-01-15", // on/after FRESHNESS_ADJUST_DATE
        salaryAsOfDate: "2568-10-01", // before adjustment — old salary base
        positionName: "นักจัดการงานทั่วไป",
        positionType: "วิชาการ",
        positionLevel: "ชำนาญการ",
        bureau: "กองการเจ้าหน้าที่",
      },
    })

    const result = await isOrderStale(order)
    assert.strictEqual(result.statusSalary, "stale")
    assert.strictEqual(result.overallStatus, "stale")
    assert.ok(
      compareBusinessDates(order.salaryAsOfDate, FRESHNESS_ADJUST_DATE)! < 0
    )
    assert.ok(
      compareBusinessDates(order.effectiveDate, FRESHNESS_ADJUST_DATE)! >= 0
    )
  })

  test("returns stale when salaryAsOfDate is before latest adjustment", async () => {
    const order = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "transfer",
        issueDate: "2568-10-01",
        effectiveDate: "2568-10-01",
        salaryAsOfDate: "2568-10-01", // before FRESHNESS_ADJUST_DATE
        positionName: "นักจัดการงานทั่วไป",
        positionType: "วิชาการ",
        positionLevel: "ชำนาญการ",
        bureau: "กองการเจ้าหน้าที่",
      },
    })

    const result = await isOrderStale(order)
    assert.strictEqual(result.overallStatus, "stale")
  })

  test("J1: stale when salaryAsOfDate before education council approval", async () => {
    await prisma.employeeEducationAdjustment.create({
      data: {
        employeeId: personId,
        oldEducation: "ปริญญาตรี",
        newEducation: "ปริญญาโท",
        councilApprovalDate: "2569-03-15",
        oldSalary: 25000,
        newSalary: 28000,
      },
    })

    const order = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "transfer",
        issueDate: "2569-03-20",
        effectiveDate: "2569-03-20",
        salaryAsOfDate: "2569-01-01",
        positionName: "นักจัดการงานทั่วไป",
        positionType: "วิชาการ",
        positionLevel: "ชำนาญการ",
        bureau: "กองการเจ้าหน้าที่",
      },
    })

    const maxDate = await getMaxSalaryEffectiveDate(personId)
    assert.strictEqual(maxDate, "2569-03-15")

    const result = await isOrderStale(order)
    assert.strictEqual(result.statusSalary, "stale")
    assert.strictEqual(result.overallStatus, "stale")
  })

  test("B1: transfer with salaryAsOfDate 2568-10-01 stale after later salary event", async () => {
    await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "salary_increase",
        issueDate: "2569-04-01",
        effectiveDate: "2569-04-01",
        orderStatus: "active",
      },
    })

    const order = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "transfer",
        issueDate: "2569-05-20",
        effectiveDate: "2569-05-20",
        salaryAsOfDate: "2568-10-01",
        positionName: "นักจัดการงานทั่วไป",
        positionType: "วิชาการ",
        positionLevel: "ชำนาญการ",
        bureau: "กองการเจ้าหน้าที่",
      },
    })

    const maxDate = await getMaxSalaryEffectiveDate(personId)
    assert.ok(maxDate)
    assert.ok(compareBusinessDates(order.salaryAsOfDate, maxDate)! < 0)

    const result = await isOrderStale(order)
    assert.strictEqual(result.statusSalary, "stale")
    assert.strictEqual(result.overallStatus, "stale")
  })

  test("returns stale when position level differs from current", async () => {
    const order = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "promotion",
        issueDate: "2568-06-01",
        effectiveDate: "2568-06-01",
        salaryAsOfDate: "2568-06-01",
        positionLevel: "ปฏิบัติการ", // different from "ชำนาญการ"
        positionName: "นักจัดการงานทั่วไป",
        positionType: "วิชาการ",
        bureau: "กองการเจ้าหน้าที่",
      },
    })

    const result = await isOrderStale(order)
    assert.strictEqual(result.overallStatus, "stale")
    assert.strictEqual(result.statusLevel, "stale")
  })

  test("returns latest when order salaryAsOfDate is null", async () => {
    const order = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "other",
        issueDate: "2569-01-01",
        effectiveDate: "2569-01-01",
      },
    })

    const result = await isOrderStale(order)
    assert.strictEqual(result.overallStatus, "latest")
  })
})

describe("getMaxSalaryEffectiveDate", () => {
  test("returns latest date from salary sources", async () => {
    const date = await getMaxSalaryEffectiveDate(personId)
    assert.strictEqual(typeof date, "string")
    assert.ok(date)
    assert.ok(compareBusinessDates(date, FRESHNESS_ADJUST_DATE)! >= 0)
  })

  test("includes active salary_qualification effective date in max", async () => {
    await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "salary_qualification",
        issueDate: "2569-06-01",
        effectiveDate: "2569-06-01",
        orderStatus: "active",
      },
    })

    const date = await getMaxSalaryEffectiveDate(personId)
    assert.strictEqual(date, "2569-06-01")
  })

  test("returns null for non-existent person", async () => {
    const date = await getMaxSalaryEffectiveDate(999999)
    assert.strictEqual(date, null)
  })
})

describe("hasDependency", () => {
  test("salary_increase affects order with salaryAsOfDate", () => {
    assert.strictEqual(
      hasDependency(
        {
          orderType: "transfer",
          effectiveDate: "2569-05-20",
          salaryAsOfDate: "2568-10-01",
        },
        { id: 1, orderType: "salary_increase", effectiveDate: "2569-04-01" }
      ),
      true
    )
  })

  test("salary_increase does not affect order without salaryAsOfDate", () => {
    assert.strictEqual(
      hasDependency(
        {
          orderType: "transfer",
          effectiveDate: "2569-05-20",
          salaryAsOfDate: null,
        },
        { id: 1, orderType: "salary_increase", effectiveDate: "2569-04-01" }
      ),
      false
    )
  })

  test("resign cancels salary_increase on or after resign date", () => {
    assert.strictEqual(
      hasDependency(
        {
          orderType: "salary_increase",
          effectiveDate: "2569-06-01",
          salaryAsOfDate: null,
        },
        { id: 2, orderType: "resign", effectiveDate: "2569-05-01" }
      ),
      true
    )
  })

  test("promotion affects earlier salary_increase order", () => {
    assert.strictEqual(
      hasDependency(
        {
          orderType: "salary_increase",
          effectiveDate: "2569-04-01",
          salaryAsOfDate: null,
        },
        { id: 3, orderType: "promotion", effectiveDate: "2569-03-15" }
      ),
      true
    )
  })

  test("salary_cap_adjustment affects order referencing salary", () => {
    assert.strictEqual(
      hasDependency(
        {
          orderType: "transfer",
          effectiveDate: "2569-05-20",
          salaryAsOfDate: "2569-04-01",
        },
        {
          id: 4,
          orderType: "salary_cap_adjustment",
          effectiveDate: "2569-05-01",
        }
      ),
      true
    )
  })
})

describe("previewImpact", () => {
  test("flags transfer with salaryAsOfDate when previewing salary_increase", async () => {
    const existing = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "transfer",
        issueDate: "2569-05-20",
        effectiveDate: "2569-05-20",
        orderStatus: "active",
        salaryAsOfDate: "2568-10-01",
        positionName: "นักจัดการงานทั่วไป",
        positionType: "วิชาการ",
        positionLevel: "ชำนาญการ",
        bureau: "กองการเจ้าหน้าที่",
      },
    })

    const preview = await previewImpact({
      employeeId: personId,
      orderType: "salary_increase",
      effectiveDate: "2569-04-01",
    })

    assert.ok(preview.affectedOrders.some((o) => o.id === existing.id))
    assert.ok(preview.totalAffected >= 1)
  })
})

describe("validateOrderFreshness", () => {
  test("returns all 5 freshness flags", async () => {
    const order = await prisma.order.findFirst({
      where: { employeeId: personId },
    })
    assert.ok(order, "No order found for test person")

    const result = await validateOrderFreshness(order!.id)
    assert.ok("statusSalary" in result)
    assert.ok("statusPosition" in result)
    assert.ok("statusType" in result)
    assert.ok("statusLevel" in result)
    assert.ok("statusOrg" in result)
  })

  test("updates order freshness flags in database", async () => {
    const order = await prisma.order.findFirst({
      where: { employeeId: personId },
    })
    assert.ok(order)

    const result = await validateOrderFreshness(order!.id)

    const updated = await prisma.order.findUnique({
      where: { id: order!.id },
    })
    assert.ok(updated)
    assert.strictEqual(updated!.statusSalary, result.statusSalary)
  })
})

describe("cascadeStaleCheck", () => {
  test("returns number for existing order", async () => {
    const order = await prisma.order.create({
      data: {
        employeeId: personId,
        orderType: "salary_apr",
        issueDate: "2569-04-01",
        effectiveDate: "2569-04-01",
        orderStatus: "active",
      },
    })

    const result = await cascadeStaleCheck(order.id)
    assert.ok(typeof result === "number")
  })

  test("returns 0 for non-existent order", async () => {
    const result = await cascadeStaleCheck(999999)
    assert.strictEqual(result, 0)
  })
})
