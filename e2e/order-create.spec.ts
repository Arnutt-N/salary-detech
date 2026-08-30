import { test, expect, type Page } from "@playwright/test"

async function login(page: Page) {
  const username = process.env.ADMIN_USERNAME ?? "admin"
  const password = process.env.ADMIN_PASSWORD ?? "password"
  await page.goto("/login")
  await page.getByLabel("ชื่อผู้ใช้").fill(username)
  await page.getByLabel("รหัสผ่าน").fill(password)
  await page.getByRole("button", { name: "เข้าระบบ" }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

async function createActiveOrder(
  page: Page,
  order: { orderNo: string; effectiveDate: string; salaryAsOfDate: string; salary: number }
) {
  await page.goto("/orders/new")
  await page.getByPlaceholder("ค้นหาชื่อ...").fill("สมหญิง")
  await page.getByRole("button", { name: "ค้นหา" }).click()
  await page.getByRole("button", { name: /สมหญิง ใจดี/ }).click()
  await expect(page.getByText("✅ เลือก: สมหญิง ใจดี")).toBeVisible()

  await page.locator("#order-orderNo").fill(order.orderNo)
  await page.locator("#order-issueDate").fill(order.effectiveDate)
  await page.locator("#order-effectiveDate").fill(order.effectiveDate)
  // Snapshot fields carry the "new" prefix (prior fields are "prior-…")
  await page.locator("#order-new-salary").fill(String(order.salary))
  await page.locator("#order-new-salaryAsOfDate").fill(order.salaryAsOfDate)
  await page.getByRole("button", { name: /บันทึกและเปิดใช้/ }).click()
  await expect(page).toHaveURL(/\/orders$/)
}

test.describe("order creation & stale warning", () => {
  test("creates an active salary order from the UI and lists it fresh", async ({ page }) => {
    await login(page)

    // Fresh order: salary_as_of_date matches its own effective date, which is
    // later than every salary order seeded before it.
    await createActiveOrder(page, {
      orderNo: "E2E-SAL-001",
      effectiveDate: "2025-08-01",
      salaryAsOfDate: "2025-08-01",
      salary: 25000,
    })

    const row = page.locator("tbody tr", { hasText: "E2E-SAL-001" })
    await expect(row).toBeVisible()
    await expect(row).toContainText("🟢 ล่าสุด")
  })

  test("flags an order stale when its salary-as-of date predates the latest salary order", async ({ page }) => {
    await login(page)

    // Stale order (สถานการณ์ B): salary_as_of_date (2025-01-01) predates the
    // latest salary effective date (2025-08-01 from E2E-SAL-001, or the seeded
    // 2025-04-01 order when this test runs alone).
    await createActiveOrder(page, {
      orderNo: "E2E-SAL-002",
      effectiveDate: "2025-09-01",
      salaryAsOfDate: "2025-01-01",
      salary: 26000,
    })

    const row = page.locator("tbody tr", { hasText: "E2E-SAL-002" })
    await expect(row).toBeVisible()
    await expect(row).toContainText("🟡 ต้องแก้ไข")
  })
})
