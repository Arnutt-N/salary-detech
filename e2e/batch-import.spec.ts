import { readFileSync } from "node:fs"
import path from "node:path"
import { test, expect } from "@playwright/test"

const runtime = JSON.parse(
  readFileSync(path.join(__dirname, ".runtime.json"), "utf8")
) as { batchId: number }

const sampleXlsx = path.join(
  __dirname,
  "..",
  "docs",
  "templates",
  "import-sample-seed.xlsx"
)

test.describe("batch import workflow", () => {
  test("login → import xlsx → batch preview → approve", async ({ page }) => {
    const username = process.env.ADMIN_USERNAME ?? "admin"
    const password = process.env.ADMIN_PASSWORD ?? "password"

    await page.goto("/login")
    await page.getByLabel("ชื่อผู้ใช้").fill(username)
    await page.getByLabel("รหัสผ่าน").fill(password)
    await page.getByRole("button", { name: "เข้าระบบ" }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto(`/batches/${runtime.batchId}`)
    await expect(page.getByTestId("batch-status")).toContainText("แบบร่าง")

    await page.getByTestId("import-file").setInputFiles(sampleXlsx)
    await page.getByTestId("import-preview").click()
    await expect(page.getByText(/พร้อม 2/)).toBeVisible({ timeout: 30_000 })

    await page.getByTestId("import-commit").click()
    await expect(page.locator("tbody tr")).toHaveCount(2, { timeout: 30_000 })

    await page.getByTestId("batch-preview").click()
    await expect(page.getByTestId("batch-status")).toContainText("ตรวจสอบแล้ว", {
      timeout: 30_000,
    })

    await page.getByTestId("batch-approve-all").click()
    await expect(page.getByTestId("batch-status")).toContainText("อนุมัติแล้ว", {
      timeout: 30_000,
    })

    await expect(page.locator("tbody tr").first()).toContainText("มีผล")
  })
})
