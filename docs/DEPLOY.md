# Deploy — Salary Detech (Vercel + Turso)

## Prerequisites

- GitHub repo connected to [Vercel](https://vercel.com)
- [Turso](https://turso.tech) database (libSQL)
- Node.js 20 locally for one-time schema push

## 1. Turso database

```bash
# Install Turso CLI, then:
turso db create salary-detech-prod
turso db show salary-detech-prod --url
turso db tokens create salary-detech-prod
```

Save `TURSO_DATABASE_URL` (`libsql://…`) and `TURSO_AUTH_TOKEN`.

Push schema once (from your machine or CI with secrets):

```bash
export DATABASE_URL="libsql://…"
export TURSO_DATABASE_URL="libsql://…"
export TURSO_AUTH_TOKEN="…"
npx prisma db push
npx tsx prisma/seed.ts   # optional demo data only
```

## 2. Vercel project

1. **Import** GitHub repo `Arnutt-N/salary-detech` in Vercel.
2. **Framework**: Next.js (auto-detected).
3. **Build command**: `npm run build`
4. **Install command**: `npm ci` (runs `postinstall` → `prisma generate`)

### Environment variables (Production + Preview)

| Variable | Required | Notes |
|----------|----------|-------|
| `TURSO_DATABASE_URL` | Yes | Runtime DB (`libsql://…`) |
| `TURSO_AUTH_TOKEN` | Yes | Turso auth token |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Yes | Set to `true` on Vercel |
| `ADMIN_USERNAME` | Yes | Login username |
| `ADMIN_PASSWORD` | Yes | Strong password — never commit |
| `CRON_SECRET` | Yes | Protects `/api/cron/cleanup-previews` |
| `SENTRY_DSN` | Optional | Error tracking |
| `DATABASE_URL` | Optional | Same as Turso URL if using Prisma CLI in build |

`vercel.json` already configures daily preview cleanup at `0 2 * * *` UTC.

## 3. Post-deploy checks

1. Open `/login` — sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
2. Dashboard loads without 500 errors.
3. Create draft batch → import `docs/templates/import-sample-seed.xlsx` → Preview → Approve.
4. (Optional) Trigger cron manually:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://YOUR_DOMAIN/api/cron/cleanup-previews
   ```

## 4. CI (GitHub Actions)

`.github/workflows/ci.yml` runs lint, build, unit tests, and Playwright E2E on every push/PR to `main`.

Local E2E (builds production server on port 3099):

```bash
npm run test:e2e:full
```

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login always fails | Set `ADMIN_PASSWORD` in Vercel env; redeploy |
| DB connection error | Check `TURSO_*` vars; token not expired |
| Build fails on Prisma | Ensure `postinstall` runs; `DATABASE_URL` or Turso URL set for generate |
| Cron 401 | Set `CRON_SECRET`; Vercel sends `Authorization: Bearer …` |

See also `docs/RUNBOOK.md` for operator-facing usage.
