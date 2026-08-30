/**
 * DPIS connection smoke test (P7 Task 5.2)
 * Sends one test record to all 3 integration endpoints and prints PASS/FAIL
 * per step, then exits 0 only when every step passes.
 *
 * Usage (run against staging or local dev — it creates a real test record):
 *   INTEGRATION_SECRET=<secret> npx tsx scripts/dpis-smoke-test.ts --base-url http://localhost:3000
 *   npx tsx scripts/dpis-smoke-test.ts --base-url https://<staging-host> --secret <secret>
 *
 * Test markers it writes (for cleanup by an admin afterwards):
 *   person citizenId "9999999999999", order orderNo "DPIS-SMOKE-TEST"
 */

type JsonRecord = Record<string, unknown> | null

const TEST_CITIZEN_ID = "9999999999999"
const TEST_ORDER_NO = "DPIS-SMOKE-TEST"
const NOT_FOUND_EMPLOYEE_ID = 999999999

function parseArgs(argv: string[]): { baseUrl: string; secret: string | null } {
  let baseUrl = "http://localhost:3000"
  let secret: string | null = process.env.INTEGRATION_SECRET ?? null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base-url") baseUrl = argv[++i] ?? baseUrl
    if (argv[i] === "--secret") secret = argv[++i] ?? secret
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), secret }
}

async function post(
  baseUrl: string,
  path: string,
  body: unknown,
  secret: string | null
): Promise<{ status: number; json: JsonRecord }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (secret) headers.Authorization = `Bearer ${secret}`

  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
  } catch (err: unknown) {
    throw new Error(
      `เชื่อมต่อไปยัง ${baseUrl} ไม่ได้ (${err instanceof Error ? err.message : "network error"})`
    )
  }

  let json: JsonRecord = null
  try {
    json = (await res.json()) as JsonRecord
  } catch {
    // non-JSON response — keep json null, status still meaningful
  }
  return { status: res.status, json }
}

function num(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0)
}

function syncData(json: JsonRecord): Record<string, unknown> | undefined {
  return json?.data as Record<string, unknown> | undefined
}

function errorsCount(json: JsonRecord): number {
  const errors = syncData(json)?.errors
  return Array.isArray(errors) ? errors.length : 0
}

const SERVER_NOT_CONFIGURED = "ฝั่งเซิร์ฟเวอร์ยังไม่ได้ตั้ง INTEGRATION_SECRET (fail-closed) — แจ้งผู้ดูแลระบบ Salary Detech"

async function main() {
  const { baseUrl, secret } = parseArgs(process.argv.slice(2))
  if (!secret) {
    console.error("ยังไม่ได้ระบุรหัส — ใช้ --secret <secret> หรือตั้ง env INTEGRATION_SECRET")
    process.exitCode = 1
    return
  }

  const results: { step: string; pass: boolean; detail: string }[] = []

  // Step 0 — auth gate: a request without credentials must be rejected (401)
  try {
    const { status, json } = await post(baseUrl, "/api/v1/integrations/employees/sync", {}, null)
    if (status === 401) {
      results.push({ step: "auth gate (ปฏิเสธคำขอไม่แนบรหัส)", pass: true, detail: "401 ตามที่กำหนด" })
    } else if (status === 503) {
      results.push({ step: "auth gate (ปฏิเสธคำขอไม่แนบรหัส)", pass: false, detail: SERVER_NOT_CONFIGURED })
    } else {
      results.push({
        step: "auth gate (ปฏิเสธคำขอไม่แนบรหัส)",
        pass: false,
        detail: `ได้สถานะ ${status} (คาด 401) — JSON: ${JSON.stringify(json)}`,
      })
    }
  } catch (err: unknown) {
    results.push({ step: "auth gate (ปฏิเสธคำขอไม่แนบรหัส)", pass: false, detail: err instanceof Error ? err.message : String(err) })
  }

  // Step 1 — employees/sync with a test person (idempotent: rerun = updated)
  try {
    const { status, json } = await post(
      baseUrl,
      "/api/v1/integrations/employees/sync",
      {
        per_cardno: TEST_CITIZEN_ID,
        pn_name: "คุณ",
        per_name: "SMOKE",
        per_surname: "TEST (ข้อมูลทดสอบการเชื่อมต่อ)",
        pos_name: "ตำแหน่งทดสอบระบบ",
        per_salary: "99999",
        per_active: 1,
      },
      secret
    )
    const data = syncData(json)
    const accepted = status === 200 && json?.success === true && num(data?.created) + num(data?.updated) === 1
    results.push({
      step: "POST /api/v1/integrations/employees/sync",
      pass: accepted,
      detail: accepted
        ? `created=${num(data?.created)} updated=${num(data?.updated)}`
        : status === 503
          ? SERVER_NOT_CONFIGURED
          : `สถานะ ${status} — JSON: ${JSON.stringify(json)}`,
    })
  } catch (err: unknown) {
    results.push({ step: "POST /api/v1/integrations/employees/sync", pass: false, detail: err instanceof Error ? err.message : String(err) })
  }

  // Step 2 — orders/sync with a test order (first run created, rerun skipped)
  try {
    const { status, json } = await post(
      baseUrl,
      "/api/v1/integrations/orders/sync",
      {
        com_no: TEST_ORDER_NO,
        com_date: "2569-01-01",
        cmd_date: "2569-01-01",
        mov_code: "20100",
        cmd_salary: "99999",
        per_cardno: TEST_CITIZEN_ID,
      },
      secret
    )
    const data = syncData(json)
    const touched = num(data?.created) + num(data?.updated) + num(data?.skipped)
    const accepted = status === 200 && json?.success === true && touched === 1 && errorsCount(json) === 0
    results.push({
      step: "POST /api/v1/integrations/orders/sync",
      pass: accepted,
      detail: accepted
        ? `created=${num(data?.created)} skipped=${num(data?.skipped)} updated=${num(data?.updated)}`
        : status === 503
          ? SERVER_NOT_CONFIGURED
          : `สถานะ ${status} — JSON: ${JSON.stringify(json)}`,
    })
  } catch (err: unknown) {
    results.push({ step: "POST /api/v1/integrations/orders/sync", pass: false, detail: err instanceof Error ? err.message : String(err) })
  }

  // Step 3 — freshness-check with a non-existent employee id (shape + auth only)
  try {
    const { status, json } = await post(
      baseUrl,
      "/api/v1/integrations/freshness-check",
      { employeeIds: [NOT_FOUND_EMPLOYEE_ID] },
      secret
    )
    const summary = json?.summary as Record<string, unknown> | undefined
    const accepted = status === 200 && json?.success === true && num(summary?.totalEvaluated) === 0
    results.push({
      step: "POST /api/v1/integrations/freshness-check",
      pass: accepted,
      detail: accepted
        ? `totalEvaluated=${num(summary?.totalEvaluated)} (id ทดสอบไม่มีในระบบ ตรวจเฉพาะการเชื่อมต่อ)`
        : status === 503
          ? SERVER_NOT_CONFIGURED
          : `สถานะ ${status} — JSON: ${JSON.stringify(json)}`,
    })
  } catch (err: unknown) {
    results.push({ step: "POST /api/v1/integrations/freshness-check", pass: false, detail: err instanceof Error ? err.message : String(err) })
  }

  console.log(`\nDPIS Smoke Test — ${baseUrl}\n`)
  for (const r of results) {
    console.log(`  ${r.pass ? "✔ PASS" : "✘ FAIL"}  ${r.step}`)
    console.log(`          ${r.detail}`)
  }
  const failed = results.filter((r) => !r.pass).length
  console.log(`\nสรุป: ${results.length - failed}/${results.length} ผ่าน${failed > 0 ? ` — ติดต่อผู้ดูแลระบบพร้อมผลด้านบน` : " — การเชื่อมต่อพร้อมใช้งาน"}\n`)
  // exitCode (not process.exit) — process.exit on Node 24/Windows can abort
  // teardown with a libuv assertion and clobber the exit status.
  process.exitCode = failed > 0 ? 1 : 0
}

void main()
