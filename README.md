# ASCIVUS Sales workspace — Phase 1

Internal working title. Independent Next.js 16 App Router / React / strict TypeScript modular monolith. Supabase Auth, PostgreSQL RLS, real CRM, transactional CSV/XLSX imports, currency-safe dashboards, append-only audit, a separate fictional demo, and inactive billing architecture.

## Quickstart

Use Node 24 (`.nvmrc`; minimum 22.21), npm and an existing checkout. Each cloud task is already isolated: do not create another worktree unless explicitly requested.

```bash
cd /workspace/ascivus-sales-saas
npm ci
# Create an ignored .env.local as described in docs/ENVIRONMENT.md.
# Fill only the separate target project's URL/publishable key and exact site URL.
npm run dev
```

Without Supabase configuration, the public site and `/demo` work. Authentication explicitly reports unavailable; it does not simulate a session. For production builds, provide `NEXT_PUBLIC_*` values at build time, not only at runtime. Never use BotLab credentials.

## Disposable local Supabase

Docker must be available. The fixed `supabase/config.toml` designates **ascivus-sales-disposable**, ports 55421/55422/55424, with a local mail catcher and email confirmation enabled. It never links to a hosted project. No seed is applied to customer organizations.

```bash
npx supabase start
# Inspect local status securely; do not paste generated keys into issues or logs.
npx supabase status
# For interactive use, set .env.local to this stack's API URL/publishable key
# and NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001, then:
npm run dev -- --port 3001
```

This prepared machine includes an ignored `.env.local` containing only the disposable stack URL/publishable key, with site port 3001. Start it with `npm run dev -- --port 3001`; no admin key is stored in application configuration. Fresh checkouts must configure their own environment.

Use a synthetic `@example.invalid` account. Read confirmation/recovery messages in the local mail catcher. Hosted delivery has NOT been verified.

Migrations apply in lexical order: `001_workspace.sql`, `002_imports_metrics.sql`, `003_read_limits.sql`, `004_currency.sql`, `005_audit_order.sql`. For a NEW explicitly designated non-production Supabase project only, review migrations then apply with the Supabase SQL editor or CLI after linking that NEW project. Never reset or migrate an unrelated/production project. Confirm Auth email confirmations, site URL and exact callback allowlist; see the Preview runbook.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration  # creates and removes its own disposable PostgreSQL container
npx playwright install --with-deps chromium
npm run test:e2e          # production server, no configured Supabase
npm run test:connected    # resets ONLY ascivus-sales-disposable; real Auth/REST/browser
npm audit --audit-level=moderate
```

On this cloud machine Chromium is already installed. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e`. The Playwright CDN is not allowlisted. Supabase CLI user-config writes may require the executor's normal escalation flow. The cloud Docker proxy incorrectly intercepts the Auth container's **internal health probe**; for this case use `ASCIVUS_LOCAL_PROXY_HEALTH=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:connected`. This retains actual HTTP readiness, real-session REST tests and browser assertions. It does not treat an unhealthy flag as success. Normal CI uses standard startup.

Run `npx supabase stop` when finished with this new local stack. Processes do not survive environment snapshots; restart services for each task.

## Routes

Public: `/`, `/features`, `/pricing`, `/privacy`, `/terms`. Auth: `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/auth/callback`. Protected: `/onboarding`, `/app`, `/app/customers`, `/app/contacts`, `/app/offers`, `/app/imports`, `/app/activity`, `/app/settings`. CRM entity routes include `/new` and `/:id` for edit/archive/restore. Read-only fictional preview: `/demo`, `/demo/offers`, `/demo/offers/:id`.

See [Phase 1 status](docs/PHASE1_STATUS.md), [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), [test evidence](docs/TEST_PLAN.md), and [Preview deployment](docs/PREVIEW_DEPLOYMENT.md).

**Preview: NOT DEPLOYED.** The authorized Git target is the existing `stevencarstoiu/financebot-ascivus-sass` repository, branch `phase-1`. Its `main` branch is preserved. No Vercel credentials or separate hosted Supabase project are configured. Local validation does not prove hosted readiness.
