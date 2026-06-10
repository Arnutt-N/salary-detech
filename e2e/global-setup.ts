import { execSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const root = path.join(__dirname, "..")
const env = {
  ...process.env,
  DATABASE_URL: "file:./dev.db",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-test-secret",
  AUTH_TRUST_HOST: "true",
  ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "password",
}

export default async function globalSetup() {
  mkdirSync(path.join(root, "e2e"), { recursive: true })

  execSync("npx prisma db push", { cwd: root, stdio: "inherit", env })
  execSync("npx tsx prisma/seed.ts", { cwd: root, stdio: "inherit", env })

  const batchId = execSync("npx tsx scripts/prepare-batch-e2e.ts", {
    cwd: root,
    encoding: "utf8",
    env,
  }).trim()

  writeFileSync(
    path.join(root, "e2e", ".runtime.json"),
    JSON.stringify({ batchId: Number(batchId) }, null, 2)
  )
}
