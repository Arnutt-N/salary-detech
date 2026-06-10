import { defineConfig, devices } from "@playwright/test"

const port = process.env.PLAYWRIGHT_PORT ?? "3099"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`

const serverEnv = {
  DATABASE_URL: "file:./dev.db",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-test-secret",
  AUTH_TRUST_HOST: "true",
  ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "password",
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: serverEnv,
  },
  globalSetup: "./e2e/global-setup.ts",
})
