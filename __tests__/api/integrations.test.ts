import { test, describe, before } from "node:test"
import assert from "node:assert"
import { prisma } from "../../lib/prisma"
import { seedApiDb } from "../fixtures/seed-api"
import { POST as syncEmployees } from "../../app/api/v1/integrations/employees/sync/route"
import { POST as syncOrders } from "../../app/api/v1/integrations/orders/sync/route"
import { POST as freshnessCheck } from "../../app/api/v1/integrations/freshness-check/route"

let personIds: number[]

const INTEGRATION_SECRET = "test-integration-secret"

before(async () => {
  process.env.INTEGRATION_SECRET = INTEGRATION_SECRET
  const data = await seedApiDb()
  personIds = data.personIds
})

function postJson(body: unknown, authorization: string | null = `Bearer ${INTEGRATION_SECRET}`) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (authorization !== null) headers.Authorization = authorization
  return new Request("http://localhost/api/v1/integrations", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

describe("integration auth & limits", () => {
  test("rejects a request without an Authorization header (401)", async () => {
    const res = await syncEmployees(postJson({ per_cardno: "X", per_name: "x" }, null))
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.success, false)
  })

  test("rejects a wrong Bearer secret (401)", async () => {
    const res = await syncOrders(postJson({ com_no: "X" }, "Bearer wrong-secret"))
    assert.strictEqual(res.status, 401)
  })

  test("rejects every request when INTEGRATION_SECRET is not configured (503, fail-closed)", async () => {
    const saved = process.env.INTEGRATION_SECRET
    delete process.env.INTEGRATION_SECRET
    try {
      const res = await freshnessCheck(postJson({ orderIds: [1] }))
      assert.strictEqual(res.status, 503)
      const body = await res.json()
      assert.strictEqual(body.success, false)
    } finally {
      process.env.INTEGRATION_SECRET = saved
    }
  })

  test("rejects a batch larger than the record cap (413)", async () => {
    const res = await syncEmployees(postJson(Array.from({ length: 1001 }, () => ({}))))
    assert.strictEqual(res.status, 413)
    const body = await res.json()
    assert.ok(body.message.includes("Too many records"))
  })

  test("collects a per-record zod error for mistyped DPIS fields", async () => {
    const res = await syncEmployees(
      postJson([
        { per_cardno: 12345, per_name: "ตัวเลขผิดชนิด" }, // per_cardno must be a string
        { per_cardno: "7000000000099", per_name: "ถูกต้อง", per_surname: "ปกติ" },
      ])
    )
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.data.created, 1)
    assert.strictEqual(body.data.errors.length, 1)
    assert.ok(body.data.errors[0].error.includes("Invalid record"))
    assert.ok(body.data.errors[0].error.includes("per_cardno"))
  })

  test("rejects a freshness-check body with wrong shape (400)", async () => {
    const res = await freshnessCheck(postJson({ orderIds: "not-an-array" }))
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
  })
})

describe("POST /api/v1/integrations/employees/sync", () => {
  test("creates a person from a single DPIS record", async () => {
    const res = await syncEmployees(
      postJson({
        per_cardno: "7000000000001",
        per_name: "สมชาย",
        per_surname: "ดีปลี",
        pos_name: "นักวิเคราะห์นโยบายและแผน",
        level_name: "ชำนาญการ",
        org_name_ministry: "กระทรวงการคลัง",
        per_salary: "35000",
        per_active: 1,
      })
    )
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.success, true)
    assert.strictEqual(body.data.created, 1)
    assert.strictEqual(body.data.updated, 0)
    assert.strictEqual(body.data.errors.length, 0)

    const person = await prisma.person.findFirst({
      where: { citizenId: "7000000000001" },
    })
    assert.ok(person)
    assert.strictEqual(person.firstName, "สมชาย")
    assert.strictEqual(person.currentSalary, 35000)
    assert.strictEqual(person.currentPositionLevel, "ชำนาญการ")
    assert.strictEqual(person.isActive, true)
  })

  test("updates an existing person when the same citizenId is synced again", async () => {
    const res = await syncEmployees(
      postJson({
        per_cardno: "7000000000001",
        per_name: "สมชาย",
        per_surname: "ดีปลี",
        per_salary: "40000",
      })
    )
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.data.created, 0)
    assert.strictEqual(body.data.updated, 1)

    const person = await prisma.person.findFirst({
      where: { citizenId: "7000000000001" },
    })
    assert.ok(person)
    assert.strictEqual(person.currentSalary, 40000)
  })

  test("collects per-record errors without failing the whole batch", async () => {
    const res = await syncEmployees(
      postJson([
        { pos_name: "ไม่มีเลขบัตรประชาชนและชื่อ" },
        { per_cardno: "7000000000002", per_name: "สมหญิง", per_surname: "ดีปลี" },
      ])
    )
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.success, true)
    assert.strictEqual(body.data.total, 2)
    assert.strictEqual(body.data.created, 1)
    assert.strictEqual(body.data.errors.length, 1)
    assert.ok(body.data.errors[0].error.includes("Missing required citizen ID or name"))
  })

  test("rejects an empty array with 400", async () => {
    const res = await syncEmployees(postJson([]))
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
  })
})

describe("POST /api/v1/integrations/orders/sync", () => {
  test("creates an active order resolving the employee by citizenId", async () => {
    const res = await syncOrders(
      postJson({
        com_no: "DPIS-ORD-001",
        com_date: "2569-05-10 00:00:00",
        cmd_date: "2569-05-01 00:00:00",
        mov_code: "30200",
        cmd_salary: "22000",
        pos_name: "นักจัดการงานทั่วไป",
        per_cardno: "1100200300402",
      })
    )
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.success, true)
    assert.strictEqual(body.data.created, 1)
    assert.strictEqual(body.data.staleFound, 0)
    assert.strictEqual(body.data.cascaded, 0)
    assert.strictEqual(body.data.errors.length, 0)

    const order = await prisma.order.findFirst({
      where: { orderNo: "DPIS-ORD-001" },
    })
    assert.ok(order)
    assert.strictEqual(order.employeeId, personIds[1])
    assert.strictEqual(order.orderType, "transfer")
    assert.strictEqual(order.effectiveDate, "2569-05-01")
    assert.strictEqual(order.issueDate, "2569-05-10")
    assert.strictEqual(order.salary, 22000)
    assert.strictEqual(order.movementCode, "30200")
    assert.strictEqual(order.orderStatus, "active")
  })

  test("reports an error for an order whose employee is not in the database", async () => {
    const res = await syncOrders(
      postJson({
        com_no: "DPIS-ORD-404",
        cmd_date: "2569-05-01",
        mov_code: "20100",
        cmd_salary: 20000,
        per_cardno: "0000000000000",
      })
    )
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.data.created, 0)
    assert.strictEqual(body.data.errors.length, 1)
    assert.ok(body.data.errors[0].error.includes("Person not found"))

    const order = await prisma.order.findFirst({
      where: { orderNo: "DPIS-ORD-404" },
    })
    assert.strictEqual(order, null)
  })

  test("flags a synced order stale when its salary_as_of_date predates the latest salary order", async () => {
    // Seed person 1 has an active salary_oct order effective 2568-10-01 (TEST-001)
    // Step 1: a later salary order that is fresh at ingest time
    const freshRes = await syncOrders(
      postJson({
        com_no: "DPIS-SAL-A",
        com_date: "2569-04-01",
        cmd_date: "2569-04-01",
        mov_code: "20100",
        cmd_salary: 25000,
        per_cardno: "1100200300401",
      })
    )
    const freshBody = await freshRes.json()
    assert.strictEqual(freshBody.data.created, 1)
    assert.strictEqual(freshBody.data.staleFound, 0)

    // Step 2: a new order carrying an old salary-as-of date -> must be flagged stale
    const staleRes = await syncOrders(
      postJson({
        com_no: "DPIS-SAL-B",
        com_date: "2569-06-01",
        cmd_date: "2569-06-01",
        mov_code: "20100",
        cmd_salary: 26000,
        salary_as_of_date: "2568-10-01",
        per_cardno: "1100200300401",
      })
    )
    const staleBody = await staleRes.json()
    assert.strictEqual(staleRes.status, 200)
    assert.strictEqual(staleBody.data.created, 1)
    assert.strictEqual(staleBody.data.staleFound, 1)

    const staleOrder = await prisma.order.findFirst({
      where: { orderNo: "DPIS-SAL-B" },
    })
    assert.ok(staleOrder)
    assert.strictEqual(staleOrder.statusSalary, "stale")
    assert.strictEqual(staleOrder.orderStatus, "active")
  })

  // Mirrors checks 2–4: no org change history means there is nothing to
  // contradict, so org fields must stay latest (scenario C4 spirit).
  test("keeps org latest when an order carries org fields but the employee has no org change history", async () => {
    const res = await syncOrders(
      postJson({
        com_no: "DPIS-ORD-ORG",
        com_date: "2569-05-01",
        cmd_date: "2569-05-01",
        mov_code: "30200",
        cmd_salary: 21000,
        org_bureau: "กองนโยบายและแผน",
        per_cardno: "1100200300403",
      })
    )
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.data.created, 1)
    assert.strictEqual(body.data.staleFound, 0)

    const order = await prisma.order.findFirst({
      where: { orderNo: "DPIS-ORD-ORG" },
    })
    assert.ok(order)
    assert.strictEqual(order.statusOrg, "latest")
    assert.strictEqual(order.statusSalary, "latest")
  })

  // Dedupe by (orderNo, employeeId): DPIS is the source of truth, so re-pushing
  // an identical order must not create a second row (P7 plan Task 1.1).
  test("skips a re-pushed identical order instead of creating a duplicate", async () => {
    const payload = {
      com_no: "DPIS-DUP-001",
      com_date: "2569-05-01",
      cmd_date: "2569-05-01",
      mov_code: "20100",
      cmd_salary: 24000,
      per_cardno: "1100200300404",
    }

    const first = await syncOrders(postJson(payload))
    const firstBody = await first.json()
    assert.strictEqual(firstBody.data.created, 1)
    assert.strictEqual(firstBody.data.skipped, 0)
    assert.strictEqual(firstBody.data.updated, 0)

    const second = await syncOrders(postJson(payload))
    const secondBody = await second.json()
    assert.strictEqual(secondBody.data.created, 0)
    assert.strictEqual(secondBody.data.skipped, 1)
    assert.strictEqual(secondBody.data.updated, 0)

    const count = await prisma.order.count({ where: { orderNo: "DPIS-DUP-001" } })
    assert.strictEqual(count, 1)
  })

  test("updates a re-pushed order when its snapshot changed and re-validates freshness", async () => {
    const base = {
      com_no: "DPIS-DUP-002",
      com_date: "2569-05-01",
      cmd_date: "2569-05-01",
      mov_code: "20100",
      cmd_salary: 24000,
      per_cardno: "1100200300405",
    }

    await syncOrders(postJson(base))
    const res = await syncOrders(postJson({ ...base, cmd_salary: 28000 }))
    const body = await res.json()

    assert.strictEqual(body.data.created, 0)
    assert.strictEqual(body.data.skipped, 0)
    assert.strictEqual(body.data.updated, 1)
    assert.strictEqual(body.data.errors.length, 0)

    const order = await prisma.order.findFirst({
      where: { orderNo: "DPIS-DUP-002" },
    })
    assert.ok(order)
    assert.strictEqual(order.salary, 28000)
    // Freshness was re-evaluated on the update path (only salary order of person 5)
    assert.strictEqual(order.statusSalary, "latest")
  })

  test("does not dedupe orders without an orderNo (no key)", async () => {
    const payload = {
      cmd_date: "2569-05-01",
      mov_code: "20100",
      cmd_salary: 21000,
      per_cardno: "1100200300404",
    }

    const res = await syncOrders(postJson([payload, payload]))
    const body = await res.json()

    assert.strictEqual(body.data.created, 2)
    assert.strictEqual(body.data.skipped, 0)
    assert.strictEqual(body.data.updated, 0)
  })
})

describe("POST /api/v1/integrations/freshness-check", () => {
  test("requires orderIds or employeeIds", async () => {
    const res = await freshnessCheck(postJson({}))
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
  })

  test("evaluates all active orders of an employee with live freshness and payroll actions", async () => {
    const res = await freshnessCheck(postJson({ employeeIds: [personIds[0]] }))
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.success, true)

    // Person 1 active orders: seeded TEST-001, TEST-002 + synced DPIS-SAL-A, DPIS-SAL-B
    // DPIS-SAL-B pushed the max salary date to 2569-06-01, so both DPIS-SAL-A and
    // DPIS-SAL-B (salary_as_of 2568-10-01) evaluate stale; the seeded ones stay latest.
    assert.strictEqual(body.summary.totalEvaluated, 4)
    assert.strictEqual(body.summary.cleanOrders, 2)
    assert.strictEqual(body.summary.staleOrders, 2)

    for (const entry of body.data) {
      assert.strictEqual(entry.employee.citizenId, "1100200300401")
      assert.strictEqual(
        entry.payrollAction,
        entry.freshness.overallStatus === "stale" ? "HOLD_AND_REVISE" : "PROCEED"
      )
    }
    const staleNos = body.data
      .filter((e: { freshness: { overallStatus: string } }) => e.freshness.overallStatus === "stale")
      .map((e: { orderNo: string }) => e.orderNo)
      .sort()
    assert.deepStrictEqual(staleNos, ["DPIS-SAL-A", "DPIS-SAL-B"])
  })

  test("evaluates a single order by orderIds", async () => {
    const staleOrder = await prisma.order.findFirst({
      where: { orderNo: "DPIS-SAL-B" },
    })
    assert.ok(staleOrder)

    const res = await freshnessCheck(postJson({ orderIds: [staleOrder.id] }))
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.summary.totalEvaluated, 1)
    assert.strictEqual(body.summary.staleOrders, 1)
    assert.strictEqual(body.data[0].orderNo, "DPIS-SAL-B")
    assert.strictEqual(body.data[0].freshness.overallStatus, "stale")
    assert.strictEqual(body.data[0].payrollAction, "HOLD_AND_REVISE")
  })
})
