/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe, before } from "node:test"
import assert from "node:assert"
import { seedApiDb } from "../fixtures/seed-api"
import { GET as getEmployees, POST as postEmployee } from "../../app/api/employees/route"
import { GET as getEmployeeById, PUT as putEmployee } from "../../app/api/employees/[id]/route"

let personIds: number[]

before(async () => {
  const data = await seedApiDb()
  personIds = data.personIds
})

describe("GET /api/employees", () => {
  test("returns paginated list", async () => {
    const req = new Request("http://localhost/api/employees?page=1&limit=3")
    const res = await getEmployees(req as any)
    const body = await res.json()

    assert.ok(Array.isArray(body.persons))
    assert.ok(body.persons.length <= 50) // PAGE_SIZE default
    assert.ok(body.total >= 5)
    assert.strictEqual(body.page, 1)
    assert.strictEqual(body.limit, 50)
  })

  test("search filters by name", async () => {
    const req = new Request(
      "http://localhost/api/employees?search=ทดสอบ1"
    )
    const res = await getEmployees(req as any)
    const body = await res.json()

    assert.ok(body.total >= 1)
    body.persons.forEach((p: any) => {
      const fullName = `${p.firstName} ${p.lastName}`
      assert.ok(fullName.includes("ทดสอบ1"), `Expected "ทดสอบ1" in "${fullName}"`)
    })
  })

  test("active filter returns only active persons", async () => {
    const req = new Request(
      "http://localhost/api/employees?active=true"
    )
    const res = await getEmployees(req as any)
    const body = await res.json()

    body.persons.forEach((p: any) => {
      assert.strictEqual(p.isActive, true)
    })
  })

  test("search filters by citizenId digits", async () => {
    const req = new Request("http://localhost/api/employees?search=1100200300401")
    const res = await getEmployees(req as any)
    const body = await res.json()

    assert.ok(body.total >= 1)
    assert.strictEqual(body.persons[0].citizenId, "1100200300401")
  })
})

describe("GET /api/employees/[id]", () => {
  test("returns person by id with counts", async () => {
    const req = new Request(
      `http://localhost/api/employees/${personIds[0]}`
    )
    const res = await getEmployeeById(req as any, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: Promise.resolve({ id: String(personIds[0]) }) as any,
    })
    const body = await res.json()

    assert.ok(body.firstName)
    assert.ok(body.lastName)
    assert.ok(typeof body.orderCount === "number")
    assert.ok(typeof body.staleCount === "number")
    assert.ok(typeof body.changeLogCount === "number")
  })

  test("returns 404 for non-existing person", async () => {
    const req = new Request("http://localhost/api/employees/99999")
    const res = await getEmployeeById(req as any, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: Promise.resolve({ id: "99999" }) as any,
    })

    assert.strictEqual(res.status, 404)
    const body = await res.json()
    assert.ok(body.error)
  })
})

describe("POST /api/employees", () => {
  test("creates person with citizenId", async () => {
    const req = new Request("http://localhost/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citizenId: "9999999999999",
        firstName: "ใหม่",
        lastName: "ทดสอบ",
        isActive: true,
      }),
    })
    const res = await postEmployee(req)
    const body = await res.json()

    assert.strictEqual(res.status, 201)
    assert.strictEqual(body.citizenId, "9999999999999")
    assert.strictEqual(body.firstName, "ใหม่")
  })

  test("rejects duplicate citizenId", async () => {
    const req = new Request("http://localhost/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citizenId: "1100200300401",
        firstName: "ซ้ำ",
        lastName: "เลขบัตร",
        isActive: true,
      }),
    })
    const res = await postEmployee(req)
    assert.strictEqual(res.status, 409)
  })
})

describe("PUT /api/employees/[id]", () => {
  test("updates person citizenId", async () => {
    const req = new Request(`http://localhost/api/employees/${personIds[4]}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citizenId: "8888888888888",
        firstName: "ทดสอบ5",
        lastName: "นามสกุล5",
        isActive: true,
      }),
    })
    const res = await putEmployee(req, {
      params: Promise.resolve({ id: String(personIds[4]) }) as any,
    })
    const body = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(body.citizenId, "8888888888888")
  })
})
